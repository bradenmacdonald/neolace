import { UUID } from "vertex-framework";

import { graph } from "../core/graph";
import { log } from "../app/log";
import { CreateBot, CreateUser } from "../core/User";
import { CreateSite } from "../core/Site";
import { CreateGroup } from "../core/Group";

// Data that gets created by default. 
// To access this, use the return value of setTestIsolation(setTestIsolation.levels.DEFAULT_...)
const data = {
    users: {
        alex: {
            email: "alex@example.com",
            fullName: "Alex Admin",
            username: "alex",
            uuid: "will be set once created." as UUID,
            bot: {
                username: "alex-bot",
                fullName: "Alex Bot 1",
                uuid: "will be set once created." as UUID,
                authToken: "will be set once created.",
            }
        },
        jamie: {
            email: "jamie@example.com",
            fullName: "Jamie User",
            username: "jamie",
            uuid: "will be set once created." as UUID,
        },
    },
    // A Site, with Alex as the admin and Jamie as a regular user
    site: {
        domain: "testsite.neolace.net",
        shortId: "site-test",
        uuid: "will be set once created." as UUID,
        adminsGroupUuid: "will be set once created." as UUID,
        usersGroupUuid: "will be set once created." as UUID,
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
    })).then(result => data.users.alex.uuid = result.uuid);

    await graph.runAsSystem(CreateBot({
        ownedByUser: data.users.alex.uuid,
        username: data.users.alex.bot.username,
        fullName: data.users.alex.bot.fullName,
    })).then(result => {
        data.users.alex.bot.uuid = result.uuid;
        data.users.alex.bot.authToken = result.authToken;
    });

    await graph.runAsSystem(CreateUser({
        email: data.users.jamie.email,
        fullName: data.users.jamie.fullName,
        username: data.users.jamie.username,
    })).then(result => data.users.jamie.uuid = result.uuid);

    await graph.runAsSystem(CreateSite({
        domain: data.site.domain,
        shortId: data.site.shortId,
        adminUser: data.users.alex.uuid,
    })).then(result => {
        data.site.uuid = result.uuid;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data.site.adminsGroupUuid = result.adminGroup!;
    });

    await graph.runAsSystem(CreateGroup({
        name: "Users",
        belongsTo: data.site.uuid,
        addUsers: [data.users.jamie.uuid],
        administerSite: false,
        administerGroups: false,
        approveEntryChanges: false,
        approveSchemaChanges: false,
        proposeEntryChanges: true,
        proposeSchemaChanges: true,
    })).then(result => data.site.usersGroupUuid = result.uuid );

    Object.freeze(data);
}
installDefaultData.data = data;
