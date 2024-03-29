/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
// deno-lint-ignore-file no-explicit-any
import { log } from "neolace/app/log.ts";
import { C, Field, VertexTestDataSnapshot, VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-sdk.ts";

import { getGraph } from "neolace/core/graph.ts";
import { CreateBot, CreateUser } from "../core/User.ts";
import { AccessMode, CreateSite } from "neolace/core/Site.ts";
import { CreateGroup } from "neolace/core/permissions/Group.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { __forScriptsOnly as objStoreUtils } from "neolace/core/objstore/objstore.ts";
import { schema } from "../sample-data/plantdb/schema.ts";
import { entryData, makePlantDbContent } from "../sample-data/plantdb/content.ts";
import { ensureFilesExist } from "../sample-data/plantdb/datafiles.ts";
import { dedent } from "neolace/lib/dedent.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { parseLookupExpressionToEntryId, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { createImages } from "../sample-data/plantdb/images.ts";

// Data that gets created by default.
// To access this, use the return value of setTestIsolation(setTestIsolation.levels.DEFAULT_...)
const data = {
    users: {
        admin: {
            id: VNID("_alex"),
            email: "alex@example.com",
            fullName: "Alex Admin",
            username: "alex",
            bot: {
                username: "alex-bot",
                fullName: "Alex Bot 1",
                id: undefined as any as VNID, // will be set once created.
                authToken: undefined as any as string, // will be set once created.
            },
        },
        regularUser: {
            id: VNID("_jamie"),
            email: "jamie@example.com",
            fullName: "Jamie User",
            username: "jamie",
            bot: {
                username: "regular-bot",
                fullName: "Regular Bot",
                id: undefined as any as VNID, // will be set once created.
                authToken: undefined as any as string, // will be set once created.
            },
        },
    },
    // A Site, with Alex as the admin and Jamie as a regular user
    site: {
        name: "PlantDB",
        domain: "plantdb.local.neolace.net",
        key: "plantdb",
        // The site will default to "PublicContributions" access mode. To test different access modes, update the site's access mode in your test case.
        initialAccessMode: AccessMode.PublicContributions as const,
        id: undefined as any as VNID, // will be set once created.
        adminsGroupId: undefined as any as VNID, // will be set once created.
        usersGroupId: undefined as any as VNID, // will be set once created.
    },
    otherSite: {
        // A site with no content, but can be used for checking that edits are restricted to one site
        // (e.g. try submitting an edit using the ID of a plantDB entry, while the client is scoped to otherSite)
        id: undefined as any as VNID, // will be set below once created.
        key: "home",
    },
    schema,
    entries: entryData,
};

export interface TestSetupData {
    emptySnapshot: VertexTestDataSnapshot;
    defaultDataSnapshot: VertexTestDataSnapshot;
    data: typeof data;
}
export const testDataFile = ".neolace-tests-data.json";

export async function generateTestFixtures(): Promise<TestSetupData> {
    // Wipe out all existing Neo4j data
    const graph = await getGraph();
    await graph.reverseAllMigrations();
    await graph.resetDBToSnapshot({ cypherSnapshot: "" });
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

    await graph.runAsSystem(CreateUser({
        id: data.users.admin.id,
        email: data.users.admin.email,
        fullName: data.users.admin.fullName,
        username: data.users.admin.username,
        authnId: -1,
    }));

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.admin.id,
        username: data.users.admin.bot.username,
        fullName: data.users.admin.bot.fullName,
        inheritPermissions: true,
    })).then((result) => {
        data.users.admin.bot.id = result.id;
        data.users.admin.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateUser({
        id: data.users.regularUser.id,
        email: data.users.regularUser.email,
        fullName: data.users.regularUser.fullName,
        username: data.users.regularUser.username,
        authnId: -2,
    }));

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.regularUser.id,
        username: data.users.regularUser.bot.username,
        fullName: data.users.regularUser.bot.fullName,
        inheritPermissions: true,
    })).then((result) => {
        data.users.regularUser.bot.id = result.id;
        data.users.regularUser.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateSite({
        name: "Neolace Development",
        domain: "home.local.neolace.net",
        key: `home`,
        adminUser: data.users.admin.id,
        accessMode: AccessMode.PublicReadOnly,
        homePageContent: dedent`
            # Welcome to Neolace Development

            A Neolace installation is called a "Realm", and can have one or more sites. This is the home site for your
            Neolace Development Realm. The home site is where users log in, manage their profiles, and create new sites.

            ## Sample Content Sites

            This home site doesn't have any content. To see example content, check out one of these other sites on this
            realm:

            * [**PlantDB**](http://plantdb.local.neolace.net:5555): A site showing an example of botany/biology content.
              This site is intentionally kept very small and doesn't change often, because its content is used in many
              of the backend's test cases, which expect a specific set of entries and relationships.
            * [**BricksDB**](http://bricksdb.local.neolace.net:5555): A site that lets you browse the Rebrickable
              dataset (LEGO bricks, sets, etc.). This site contains over 200,000 entries and is highly inter-connected.
              - This site is not installed by default. To create it, open \`sites/bricksdb\` and run
                \`./create-bricksdb.sh\` and \`./import-data.ts\`.

            ## Default user accounts

            There is a system administrator user already created. Use the email address **\`admin@example.com\`** to
            [log in](/account/login). Once you enter that email address into the login form, you'll have to check the
            "backend" console to get the passwordless login link in order to complete the login.

            ## Developer Resources

            * [**User Interface Demo Page**](/ui): Shows various UI components that can be used to develop the Neolace
              frontend and/or frontend plugins.
        `,
        footerContent: `Powered by [Neolace](https://www.neolace.com/).`,
        frontendConfig: {
            headerLinks: [
                { text: "Home", href: "/" },
            ],
            features: {
                hoverPreview: { enabled: true },
            },
            plugins: {},
        },
    })).then((result) => {
        data.otherSite.id = result.id;
    });

    await graph.runAsSystem(CreateSite({
        name: data.site.name,
        domain: data.site.domain,
        key: data.site.key,
        adminUser: data.users.admin.id,
        accessMode: data.site.initialAccessMode,
        homePageContent: dedent`
            # Welcome to PlantDB

            This is a demo site that contains a small amount of content useful for developing Neolace.

            ## Sample Article

            Check out [**ponderosa pine**](/entry/s-pinus-ponderosa), the featured article.
        `,
        footerContent: `Powered by [Neolace](https://www.neolace.com/).`,
        frontendConfig: {
            headerLinks: [
                { text: "Home", href: "/" },
                { text: "Ponderosa", href: "/entry/s-pinus-ponderosa" },
            ],
            features: {
                hoverPreview: { enabled: true },
            },
            plugins: {
                search: {},
            },
        },
    })).then((result) => {
        data.site.id = result.id;
        data.site.adminsGroupId = result.adminGroup!;
    });

    await graph.runAsSystem(CreateGroup({
        name: "Users",
        belongsTo: data.site.id,
        addUsers: [data.users.regularUser.id],
        grantStrings: [],
    })).then((result) => data.site.usersGroupId = result.id);

    // Import the schema
    await graph.runAsSystem(ImportSchema({ siteId: data.site.id, schema: data.schema, editSource: UseSystemSource }));

    // Import the files
    await ensureFilesExist();

    // Create some initial entry data, specifically entries about plants.
    await graph.runAsSystem(
        ApplyEdits({ siteId: data.site.id, edits: makePlantDbContent, editSource: UseSystemSource }),
    );
    await createImages(data.site.id);

    const defaultDataSnapshot = await graph.snapshotDataForTesting();

    return Object.freeze({ emptySnapshot, defaultDataSnapshot, data });
}

/**
 * Unfortunately restoring the snapshot does not restore relationship IDs, which
 * we rely on as the only way to uniquely identify relationships.
 *
 * This hacky function will re-create update the PropertyFacts to have the
 * new relationship IDs.
 */
export async function fixRelationshipIdsAfterRestoringSnapshot() {
    const graph = await getGraph();
    await graph._restrictedAllowWritesWithoutAction(async () => {
        await graph._restrictedWrite(async (tx) => {
            await tx.query(C`
                MATCH (:${Entry})-[rel:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}]->(:${Entry})
                DELETE rel
            `);
            const toProcess = await tx.query(C`
                MATCH (pf:${PropertyFact}) WHERE NOT pf.directRelNeo4jId IS NULL
                MATCH (pf)-[:${PropertyFact.rel.FOR_PROP}]->(prop:${Property})
                MATCH (entry:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf)
            `.RETURN({
                "entry.id": Field.VNID,
                "prop.type": Field.String,
                "pf.id": Field.VNID,
                "pf.valueExpression": Field.String,
            }));
            // Set directRelNeo4jId NULL for each PropertyFact because Neo4j re-uses IDs and we may otherwise
            // get conflicts as we start to update these with the current IDs.
            await tx.query(C`
                MATCH (pf:${PropertyFact}) WHERE NOT pf.directRelNeo4jId IS NULL
                SET pf.directRelNeo4jId = NULL
            `);
            // Re-create all direct IS_A relationships:
            const toCreateIsA = toProcess.filter((r) => r["prop.type"] === PropertyType.RelIsA).map((row) => ({
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
            const toCreateOther = toProcess.filter((r) => r["prop.type"] === PropertyType.RelOther).map((row) => ({
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
