import * as Joi from "@hapi/joi";
import {randomBytes} from "crypto";

import {
    C,
    VNodeType,
    SlugIdProperty,
    RawVNode,
    ValidationError,
    PublicValidationError,
    WrappedTransaction,
    defineAction,
    VNID,
    DerivedProperty,
    VirtualPropType,
} from "vertex-framework";
import { authClient } from "../api/authn";

@VNodeType.declare
export class User extends VNodeType {
    static label = "User";
    static readonly slugIdPrefix = "user-";
    static readonly properties = {
        ...VNodeType.properties,
        // slugId: starts with "user-", then follows a unique code. Can be changed any time.
        slugId: SlugIdProperty,
        // Optional full name
        fullName: Joi.string().max(100),
    };

    static async validate(dbObject: RawVNode<typeof User>, tx: WrappedTransaction): Promise<void> {
        await super.validate(dbObject, tx);
        // Mostly done automatically by Vertex Framework
        const isHuman = dbObject._labels.includes(HumanUser.label);
        const isBot = dbObject._labels.includes(BotUser.label);
        if (isHuman === isBot) {
            throw new ValidationError(`Every User must be either a Human or a Bot.`);
        }
    }

    static readonly derivedProperties = VNodeType.hasDerivedProperties({
        //isBot,
        username,
    });
}

@VNodeType.declare
export class HumanUser extends User {
    static readonly label = "Human";
    static readonly properties = {
        ...User.properties,
        // Account ID in the authentication microservice. Only set for human users. Should not be exposed to users.
        authnId: Joi.number(),
        // Email address. Not set if this user is a bot (owned by a user or group).
        email: Joi.string().email({minDomainSegments: 1, tlds: false}).required(),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** If this user is a bot, it belongs to this user (todo in future; bots could be owned by groups) */
        OWNED_BY: {
            to: [User],
            cardinality: VNodeType.Rel.ToOneOrNone,
        },
    });
}

@VNodeType.declare
export class BotUser extends User {
    static readonly label = "Bot";
    static readonly properties = {
        ...User.properties,
        // Current auth token used to authenticate this user. This acts like a "password" for authenticating this bot.
        authToken: Joi.string(),
    };

    static readonly rel = VNodeType.hasRelationshipsFromThisTo({
        /** If this user is a bot, it belongs to this user (todo in future; bots could be owned by groups) */
        OWNED_BY: {
            to: [HumanUser],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static readonly virtualProperties = VNodeType.hasVirtualProperties({
        ownedBy: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${BotUser.rel.OWNED_BY}]->(@target:${HumanUser})`,
            target: HumanUser,
        },
    });

}


/** Get the username of a user */
export function username(): DerivedProperty<string> { return DerivedProperty.make(
    User,
    user => user.slugId,
    user => user.slugId.substr(User.slugIdPrefix.length),
);}

async function isUsernameTaken(tx: WrappedTransaction, username: string): Promise<boolean> {
    const result = await tx.query(C`
        MATCH (:SlugId {slugId: ${User.slugIdPrefix + username}})-[:IDENTIFIES]->(u:${User})
    `.RETURN({}));
    return result.length > 0;
}



/** Create a human user (not a bot) */
export const CreateUser = defineAction({
    type: "CreateUser",
    parameters: {} as {
        // The user's email must already be verified.
        email: string;
        // Username. Optional. If not specified, one will be auto-generated.
        username?: string;
        fullName?: string;
    },
    resultData: {} as {
        id: VNID;
    },
    apply: async (tx, data) => {
        const vnid = VNID();

        // Find a username that's not taken
        let username = data.username; // TODO: make sure 'data' is read-only
        if (!username) {
            username = data.email.split("@")[0].replace(/[^A-Za-z0-9.-]/, "-");
            if (await isUsernameTaken(tx, username)) {
                let suffix = 1;
                while (await isUsernameTaken(tx, `${username}${suffix}`)) {
                    suffix += Math.round(Math.random() * 1_000);
                    if (suffix > 100_000) {
                        throw new Error("Unable to auto-generate a unique username.");
                    }
                }
                username = `${username}${suffix}`;
            }
        } else if (await isUsernameTaken(tx, username)) {
            throw new Error(`The username "${username}" is already taken.`);
        }

        // Create a user in the auth service
        const authnData = await authClient.createUser({username: vnid});

        const result = await tx.query(C`
            CREATE (u:Human:User:VNode {
                id: ${vnid},
                authnId: ${authnData.accountId},
                email: ${data.email},
                slugId: ${User.slugIdPrefix + username},
                fullName: ${data.fullName || null}
            })
        `.RETURN({"u.id": "vnid"}));
        const modifiedNodes = [result[0]["u.id"]];
        return {
            resultData: { id: vnid, },
            modifiedNodes,
        };
    },
    invert: (data, resultData) => null,
});


/** Create a bot */
export const CreateBot = defineAction({
    type: "CreateBot",
    parameters: {} as {
        // VNID of the user that is creating this bot
        ownedByUser: VNID;
        username: string;
        fullName?: string;
    },
    resultData: {} as {
        id: VNID;
        authToken: string;
    },
    apply: async (tx, data) => {
        if (await isUsernameTaken(tx, data.username)) {
            throw new Error(`The username "${data.username}" is already taken.`);
        }

        const vnid = VNID();
        const authToken = await createBotAuthToken();
        await tx.queryOne(C`
            MATCH (owner:${HumanUser} {id: ${data.ownedByUser}})
            CREATE (u:Bot:User:VNode {
                id: ${vnid},
                slugId: ${User.slugIdPrefix + data.username},
                authToken: ${authToken},
                fullName: ${data.fullName || null}
            })-[:${BotUser.rel.OWNED_BY}]->(owner)
        `.RETURN({}));
        return {
            resultData: { id: vnid, authToken, },
            modifiedNodes: [vnid],
        };
    },
    invert: (data, resultData) => null,
});


/**
 * Create a random token which acts like a password to authenticate bot (non-human) users
 * @returns 
 */
function createBotAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
        randomBytes(48, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                // Characters allowed in the result: A-Z, a-z, 0-9
                // This doesn't have to be a reversible transform and already has high entropy, so we don't care that
                // the base64 cleanup below creates a slight bias in favor of "a" or "b" appearing in the result.
                const token = buffer.toString("base64").replace(/\+/g, "a").replace(/\//g, "b").replace(/=/g, "");
                resolve(token);
            }
        });
    });
}

// Things that are internal but available to the test suite:
export const testExports = {
    createBotAuthToken,
};
