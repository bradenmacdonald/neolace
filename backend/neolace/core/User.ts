import * as Joi from "@hapi/joi";
import {
    C,
    VNodeType,
    ShortIdProperty,
    RawVNode,
    ValidationError,
    WrappedTransaction,
    defineAction,
    UUID,
} from "vertex-framework";
import { countryCodes } from "../lib/countries";
import { authClient } from "./auth/authn";

@VNodeType.declare
export class User extends VNodeType {
    static readonly label = "User";
    static readonly properties = {
        ...VNodeType.properties,
        // Account ID in the authentication microservice. Only set for human users. Should not be exposed to users.
        authnId: Joi.number(),
        // Email address. Not set if this user is a bot (owned by a user or group).
        email: Joi.string().email({minDomainSegments: 1, tlds: false}),
        // Public username. Unique but can be changed at any time.
        shortId: ShortIdProperty,
        // Optional real name
        realname: Joi.string(),
        // Country code
        country: Joi.string().valid("", ...countryCodes).required(),
    };
    static async validate(dbObject: RawVNode<typeof User>, tx: WrappedTransaction): Promise<void> {
        if (dbObject.authnId === undefined) {
            // This is a bot, not a human user
            if (dbObject.email !== undefined) {
                throw new ValidationError("Bots cannot have an email address.");
            }
            // TODO: assert that it's owned by a human user
        } else {
            if (!dbObject.email) {
                throw new ValidationError("An email address is required for each (human) user.");
            }
        }
    }
}


async function isUsernameTaken(tx: WrappedTransaction, username: string): Promise<boolean> {
    const result = await tx.query(C`
        MATCH (:ShortId {shortId: ${username}})-[:IDENTIFIES]->(u:${User})
    `.RETURN({"u.username": "string"}));
    return result.length > 0;
}



/** Create a human user (not a bot) */
export const CreateUser = defineAction<{
    // The user's email must already be verified.
    email: string;
    // Username. Optional. If not specified, one will be auto-generated.
    username?: string;
    realname?: string;
    country?: string;
}, {
    uuid: UUID;
}>({
    type: "CreateUser",
    apply: async (tx, data) => {
        const uuid = UUID();

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
        const authnData = await authClient.createUser({username: uuid});

        const result = await tx.query(C`
            CREATE (u:${User} {
                uuid: ${uuid},
                authnId: ${authnData.accountId},
                email: ${data.email},
                shortId: ${username},
                realname: ${data.realname || ""},
                country: ${data.country || ""}
            })
        `.RETURN({"u.uuid": "uuid"}));
        const modifiedNodes = [result[0]["u.uuid"]];
        return {
            resultData: { uuid, },
            modifiedNodes,
        };
    },
    invert: (data, resultData) => null,
});
