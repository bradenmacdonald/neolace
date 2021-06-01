import { VNID } from "vertex-framework";

import { graph } from "../core/graph";
import { log } from "../app/log";
import { CreateBot, CreateUser } from "../core/User";
import { CreateSite } from "../core/Site";
import { CreateGroup } from "../core/Group";
import { ImportSchema } from "../core/schema/import-schema";
import { ContentType } from "neolace-api";

// Data that gets created by default. 
// To access this, use the return value of setTestIsolation(setTestIsolation.levels.DEFAULT_...)
const data = {
    users: {
        alex: {
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
        jamie: {
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
        relationshipTypes: {},
    },
    wasCreated: false,
};

export async function installDefaultData(): Promise<void> {
    log(`Generating default data for tests...`);

    if (data.wasCreated) {
        throw new Error("installDefaultData() should only run once!");
    }
    data.wasCreated = true;

    await graph.runAsSystem(CreateUser({
        email: data.users.alex.email,
        fullName: data.users.alex.fullName,
        username: data.users.alex.username,
    })).then(result => data.users.alex.id = result.id);

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.alex.id,
        username: data.users.alex.bot.username,
        fullName: data.users.alex.bot.fullName,
    })).then(result => {
        data.users.alex.bot.id = result.id;
        data.users.alex.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateUser({
        email: data.users.jamie.email,
        fullName: data.users.jamie.fullName,
        username: data.users.jamie.username,
    })).then(result => data.users.jamie.id = result.id);

    await graph.runAsSystem(CreateSite({
        domain: data.site.domain,
        slugId: `site-${data.site.shortId}`,
        adminUser: data.users.alex.id,
    })).then(result => {
        data.site.id = result.id;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data.site.usersGroupId = result.adminGroup!;
    });

    await graph.runAsSystem(CreateGroup({
        name: "Users",
        belongsTo: data.site.id,
        addUsers: [data.users.jamie.id],
        administerSite: false,
        administerGroups: false,
        approveEntryEdits: false,
        approveSchemaChanges: false,
        proposeEntryEdits: true,
        proposeSchemaChanges: true,
    })).then(result => data.site.usersGroupId = result.id);

    await graph.runAsSystem(ImportSchema({siteId: data.site.id, schema: data.schema}));

    Object.freeze(data);
}
installDefaultData.data = data;
