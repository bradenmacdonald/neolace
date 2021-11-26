// deno-lint-ignore-file no-explicit-any
import * as log from "std/log/mod.ts";
import { VNID, VertexTestDataSnapshot, C, Field } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";

import { graph } from "neolace/core/graph.ts";
import { CreateBot, CreateUser } from "../core/User.ts";
import { CreateSite, AccessMode } from "neolace/core/Site.ts";
import { CreateGroup } from "neolace/core/Group.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { __forScriptsOnly as objStoreUtils } from "neolace/core/objstore/objstore.ts";
import { schema } from "../sample-data/plantdb/schema.ts";
import { entryData, makePlantDbContent } from "../sample-data/plantdb/content.ts";
import { ensureFilesExist } from "../sample-data/plantdb/datafiles.ts";
import { dedent } from "neolace/lib/dedent.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { parseLookupExpressionToEntryId, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Property } from "neolace/core/schema/Property.ts";

// Data that gets created by default. 
// To access this, use the return value of setTestIsolation(setTestIsolation.levels.DEFAULT_...)
const data = {
    users: {
        admin: {
            email: "alex@example.com",
            fullName: "Alex Admin",
            username: "alex",
            id: undefined as any as VNID,  // will be set once created.
            bot: {
                username: "alex-bot",
                fullName: "Alex Bot 1",
                id: undefined as any as VNID,  // will be set once created.
                authToken: undefined as any as string,  // will be set once created.
            }
        },
        regularUser: {
            email: "jamie@example.com",
            fullName: "Jamie User",
            username: "jamie",
            id: undefined as any as VNID,  // will be set once created.
        },
    },
    // A Site, with Alex as the admin and Jamie as a regular user
    site: {
        name: "PlantDB",
        domain: "plantdb.local.neolace.net",
        shortId: "plantdb",
        // The site will default to "PublicContributions" access mode. To test different access modes, update the site's access mode in your test case.
        initialAccessMode: AccessMode.PublicContributions as const,
        id: undefined as any as VNID,  // will be set once created.
        adminsGroupId: undefined as any as VNID,  // will be set once created.
        usersGroupId: undefined as any as VNID,  // will be set once created.
    },
    schema,
    entries: entryData,
};



export interface TestSetupData {
    emptySnapshot: VertexTestDataSnapshot,
    defaultDataSnapshot: VertexTestDataSnapshot,
    data: typeof data,
}
export const testDataFile = ".neolace-tests-data.json";

export async function generateTestFixtures(): Promise<TestSetupData> {

    // Wipe out all existing Neo4j data
    await graph.reverseAllMigrations();
    await graph.resetDBToSnapshot({cypherSnapshot: ""});
    await graph.runMigrations();

    log.info(`Creating "empty" snapshot...`);
    // We call this an "empty" snapshot but it actually includes any data created by migrations, like the system user
    const emptySnapshot = await graph.snapshotDataForTesting();

    log.info(`Uploading data files to object storage...`);

    try {
        const promises: Promise<void>[] = [];
        for await (const file of objStoreUtils.objStoreClient.listObjects()) {
            promises.push(objStoreUtils.objStoreClient.deleteObject(file.key));
        }
        await Promise.all(promises);
    } catch (err: unknown) {
        console.error(err);
        throw new Error("Unable to connect to object storage (MinIO)");
    }

    log.info(`Generating default data for tests...`);

    const action = CreateUser({
        email: data.users.admin.email,
        fullName: data.users.admin.fullName,
        username: data.users.admin.username,
    });

    await graph.runAsSystem(action).then(result => data.users.admin.id = result.id);

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.admin.id,
        username: data.users.admin.bot.username,
        fullName: data.users.admin.bot.fullName,
        inheritPermissions: true,
    })).then(result => {
        data.users.admin.bot.id = result.id;
        data.users.admin.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateUser({
        email: data.users.regularUser.email,
        fullName: data.users.regularUser.fullName,
        username: data.users.regularUser.username,
    })).then(result => data.users.regularUser.id = result.id);

    await graph.runAsSystem(CreateSite({
        name: data.site.name,
        domain: data.site.domain,
        slugId: `site-${data.site.shortId}`,
        adminUser: data.users.admin.id,
        accessMode: data.site.initialAccessMode,
        homePageMD: dedent`
            # Welcome to PlantDB

            This is a demo site that contains a small amount of content useful for developing Neolace.

            ## Sample Article

            Check out [**ponderosa pine**](/entry/s-ponderosa-pine), the featured article.
        `,
    })).then(result => {
        data.site.id = result.id;
        data.site.adminsGroupId = result.adminGroup!;
    });

    await graph.runAsSystem(CreateGroup({
        name: "Users",
        belongsTo: data.site.id,
        addUsers: [data.users.regularUser.id],
        administerSite: false,
        administerGroups: false,
        approveEntryEdits: false,
        approveSchemaChanges: false,
        proposeEntryEdits: true,
        proposeSchemaChanges: true,
    })).then(result => data.site.usersGroupId = result.id);

    // Import the schema
    await graph.runAsSystem(ImportSchema({siteId: data.site.id, schema: data.schema}));

    // Import the files
    await ensureFilesExist();

    // Create some initial entry data, specifically entries about plants.
    await graph.runAsSystem(ApplyEdits({siteId: data.site.id, edits: makePlantDbContent}));

    const defaultDataSnapshot = await graph.snapshotDataForTesting();

    return Object.freeze({emptySnapshot, defaultDataSnapshot, data});
}

/**
 * Unfortunately restoring the snapshot does not restore relationship IDs, which
 * we rely on as the only way to uniquely identify relationships.
 * 
 * This hacky function will re-create update the PropertyFacts to have the
 * new relationship IDs.
 */
export async function fixRelationshipIdsAfterRestoringSnapshot() {
    await graph._restrictedAllowWritesWithoutAction(async () => {
        await graph._restrictedWrite(async tx => {
            await tx.query(C`
                MATCH (:${Entry})-[rel:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}]->(:${Entry})
                DELETE rel
            `);
            const toProcess = await tx.query(C`
                MATCH (pf:${PropertyFact}) WHERE NOT pf.directRelNeo4jId IS NULL
                MATCH (pf)-[:${PropertyFact.rel.FOR_PROP}]->(prop:${Property})
                MATCH (entry:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf)
            `.RETURN({"entry.id": Field.VNID, "prop.type": Field.String, "pf.id": Field.VNID, "pf.valueExpression": Field.String}));
            // Set directRelNeo4jId NULL for each PropertyFact because Neo4j re-uses IDs and we may otherwise
            // get conflicts as we start to update these with the current IDs.
            await tx.query(C`
                MATCH (pf:${PropertyFact}) WHERE NOT pf.directRelNeo4jId IS NULL
                SET pf.directRelNeo4jId = NULL
            `);
            // Re-create all direct IS_A relationships:
            const toCreateIsA = toProcess.filter(r => r["prop.type"] === PropertyType.RelIsA).map(row => ({
                "fromEntryId": row["entry.id"],
                "toEntryId": parseLookupExpressionToEntryId(row["pf.valueExpression"]),
                "pfId": row["pf.id"],
            }));
            await tx.query(C`
                UNWIND ${toCreateIsA} AS row
                MATCH (fromEntry:${Entry} {id: row.fromEntryId})
                MATCH (toEntry:${Entry} {id: row.toEntryId})
                MATCH (fromEntry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact} {id: row.pfId})
                CREATE (fromEntry)-[rel:${Entry.rel.IS_A}]->(toEntry)
                SET pf.directRelNeo4jId = id(rel)
            `);
            // Re-create all direct RELATES_TO/Other relationships:
            const toCreateOther = toProcess.filter(r => r["prop.type"] === PropertyType.RelOther).map(row => ({
                "fromEntryId": row["entry.id"],
                "toEntryId": parseLookupExpressionToEntryId(row["pf.valueExpression"]),
                "pfId": row["pf.id"],
            }));
            await tx.query(C`
                UNWIND ${toCreateOther} AS row
                MATCH (fromEntry:${Entry} {id: row.fromEntryId})
                MATCH (toEntry:${Entry} {id: row.toEntryId})
                MATCH (fromEntry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact} {id: row.pfId})
                CREATE (fromEntry)-[rel:${Entry.rel.RELATES_TO}]->(toEntry)
                SET pf.directRelNeo4jId = id(rel)
            `);
        });
    });
}
