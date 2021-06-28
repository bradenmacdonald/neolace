// deno-lint-ignore-file no-explicit-any
import * as log from "std/log/mod.ts";
import { ContentType, RelationshipCategory } from "neolace/deps/neolace-api.ts";
import { VNID, VertexTestDataSnapshot } from "neolace/deps/vertex-framework.ts";

import { graph } from "neolace/core/graph.ts";
import { CreateBot, CreateUser } from "../core/User.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { CreateGroup } from "neolace/core/Group.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";


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
        domain: "testsite.neolace.net",
        shortId: "test",
        id: undefined as any as VNID,  // will be set once created.
        adminsGroupId: undefined as any as VNID,  // will be set once created.
        usersGroupId: undefined as any as VNID,  // will be set once created.
    },
    schema: {
        entryTypes: {
            "_ETCOMPUTER": {
                id: VNID("_ETCOMPUTER"),
                name: "Computer",
                contentType: ContentType.Article,
                description: "A computer is a general purpose machine that can be programmed to do different tasks or provide entertainment functions.",
                friendlyIdPrefix: "comp-",
            },
            "_ETCOMPONENT": {
                id: VNID("_ETCOMPONENT"),
                name: "Component",
                contentType: ContentType.Article,
                description: "A component is a part of a computer.",
                friendlyIdPrefix: "cn-",
            },
        },
        relationshipTypes: {
            "_ISA": {
                id: VNID("_ISA"),
                nameForward: "is a",
                nameReverse: "has type",
                category: RelationshipCategory.IS_A,
                description: null,
                fromEntryTypes: [VNID("_ETCOMPUTER")],
                toEntryTypes: [VNID("_ETCOMPUTER")],
            },
            "_ISA2": {
                id: VNID("_ISA2"),
                nameForward: "is a",
                nameReverse: "has type",
                category: RelationshipCategory.IS_A,
                description: null,
                fromEntryTypes: [VNID("_ETCOMPONENT")],
                toEntryTypes: [VNID("_ETCOMPONENT")],
            },
            "_HASA": {
                id: VNID("_HASA"),
                nameForward: "has a",
                nameReverse: "used in",
                category: RelationshipCategory.HAS_A,
                description: null,
                fromEntryTypes: [VNID("_ETCOMPUTER")],
                toEntryTypes: [VNID("_ETCOMPONENT")],
            },
        },
    },
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
    await graph.runMigrations();
    const emptySnapshot = await graph.snapshotDataForTesting();

    log.info(`Generating default data for tests...`);

    const action = CreateUser({
        email: data.users.admin.email,
        fullName: data.users.admin.fullName,
        username: data.users.admin.username,
    });
    log.info("next");

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
        domain: data.site.domain,
        slugId: `site-${data.site.shortId}`,
        adminUser: data.users.admin.id,
    })).then(result => {
        data.site.id = result.id;
        data.site.adminsGroupId = result.adminGroup;
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

    await graph.runAsSystem(ImportSchema({siteId: data.site.id, schema: data.schema}));
    const defaultDataSnapshot = await graph.snapshotDataForTesting();

    return Object.freeze({emptySnapshot, defaultDataSnapshot, data});
}
