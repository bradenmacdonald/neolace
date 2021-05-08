import { VNID } from "vertex-framework";

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
            id: "will be set once created." as VNID,
            bot: {
                username: "alex-bot",
                fullName: "Alex Bot 1",
                id: "will be set once created." as VNID,
                authToken: "will be set once created.",
            }
        },
        jamie: {
            email: "jamie@example.com",
            fullName: "Jamie User",
            username: "jamie",
            id: "will be set once created." as VNID,
        },
    },
    // A Site, with Alex as the admin and Jamie as a regular user
    site: {
        domain: "testsite.neolace.net",
        slugId: "site-test",
        id: "will be set once created." as VNID,
        adminsGroupId: "will be set once created." as VNID,
        usersGroupId: "will be set once created." as VNID,
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
        slugId: data.site.slugId,
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
        approveEntryChanges: false,
        approveSchemaChanges: false,
        proposeEntryChanges: true,
        proposeSchemaChanges: true,
    })).then(result => data.site.usersGroupId = result.id );

    Object.freeze(data);
}
installDefaultData.data = data;
