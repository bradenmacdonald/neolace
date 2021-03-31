import { UUID } from "vertex-framework";

import { graph } from "../core/graph";
import { log } from "../app/log";
import { CreateBot, CreateUser } from "../core/User";

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

    Object.freeze(data);
}
installDefaultData.data = data;
