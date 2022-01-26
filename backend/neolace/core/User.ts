import * as check from "neolace/deps/computed-types.ts";
import {
    C,
    defineAction,
    DerivedProperty,
    Field,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { createRandomToken } from "neolace/lib/secure-token.ts";

export class User extends VNodeType {
    static label = "User";
    static readonly slugIdPrefix = "user-";
    static readonly properties = {
        ...VNodeType.properties,
        // slugId: starts with "user-", then follows a unique code. Can be changed any time.
        slugId: Field.Slug,
        // Optional full name
        fullName: Field.NullOr.String.Check(check.string.max(100)),
    };

    static async validate(dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {
        // Mostly done automatically by Vertex Framework
        const isHuman = dbObject._labels.includes(HumanUser.label);
        const isBot = dbObject._labels.includes(BotUser.label);
        if (isHuman === isBot) {
            throw new ValidationError(`Every User must be either a Human or a Bot.`);
        }
    }

    static readonly derivedProperties = this.hasDerivedProperties({
        //isBot,
        username,
    });
}

export class HumanUser extends User {
    static readonly label = "Human";
    static readonly properties = {
        ...User.properties,
        // Account ID in the authentication microservice. Only set for human users. Should not be exposed to users.
        authnId: Field.Int,
        // Email address. TODO: allow multiple email addresses
        email: Field.String.Check(Field.validators.email),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});
}

export class BotUser extends User {
    static readonly label = "Bot";
    static readonly properties = {
        ...User.properties,
        // Current auth token used to authenticate this user. This acts like a "password" for authenticating this bot.
        authToken: Field.String,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /**
         * If this user is a bot, it belongs to this user.
         * Every bot has exactly one human user who is responsible for it.
         */
        OWNED_BY: {
            to: [HumanUser],
            cardinality: VNodeType.Rel.ToOneRequired,
            properties: {
                /**
                 * Inherit permissions: if this is true, then the bot has all the same permissions as the user that owns
                 * it (is a personal bot). If false, the bot must be explicitly added to groups to grant it permissions.
                 */
                inheritPermissions: Field.Boolean,
            },
        },
    });

    static readonly virtualProperties = this.hasVirtualProperties({
        ownedBy: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.OWNED_BY}]->(@target:${HumanUser})`,
            target: HumanUser,
        },
    });
}

/** Get the username of a user */
export function username(): DerivedProperty<string> {
    return DerivedProperty.make(
        User,
        (user) => user.slugId,
        (user) => user.slugId.substr(User.slugIdPrefix.length),
    );
}

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
        // Temp: allow working around the lack of authn service in prod for now
        fakeAuthn?: boolean;
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
        const authnData = data.fakeAuthn ? { accountId: 123 } : await authClient.createUser({ username: vnid });

        await tx.queryOne(C`
            CREATE (u:Human:User:VNode {
                id: ${vnid},
                authnId: ${authnData.accountId},
                email: ${data.email},
                slugId: ${User.slugIdPrefix + username},
                fullName: ${data.fullName || null}
            })
        `.RETURN({}));
        return {
            resultData: { id: vnid },
            modifiedNodes: [vnid],
            description: `Created ${HumanUser.withId(vnid)}`,
        };
    },
});

/** Create a bot */
export const CreateBot = defineAction({
    type: "CreateBot",
    parameters: {} as {
        // VNID of the user that is creating this bot
        ownedByUser: VNID;
        username: string;
        fullName?: string;
        inheritPermissions?: boolean;
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
            })-[:${BotUser.rel.OWNED_BY} {inheritPermissions: ${data.inheritPermissions ?? false}}]->(owner)
        `.RETURN({}));
        return {
            resultData: { id: vnid, authToken },
            modifiedNodes: [vnid],
            description: `Created ${BotUser.withId(vnid)}`,
        };
    },
});

/**
 * Create a random token which acts like a password to authenticate bot (non-human) users
 * @returns
 */
async function createBotAuthToken(): Promise<string> {
    return createRandomToken(48);
}

// Things that are internal but available to the test suite:
export const testExports = {
    createBotAuthToken,
};
