import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import * as Joi from "@hapi/joi";
import { User, HumanUser, BotUser } from "./User";
import { log } from "../app/log";
import { authClient } from "./auth/authn";
import { graph } from "./graph";
import { PublicUserData } from "neolace-api";
import { C } from "vertex-framework";

const prefix = `/user`;

export const userRoutes: Hapi.ServerRoute[] = [

    ///////////////////////////// Request passwordless login. See also core/auth/authn-hooks.ts
    {
        method: "POST",
        path: `${prefix}/request-login`,
        options: {
            description: "Request passwordless login",
            auth: false,
            tags: ["api"],
            validate: {
                payload: Joi.object({
                    email: HumanUser.properties.email.required(),
                }).label("PasswordlessLoginRequest"),
            },
            response: { status: {
                200: Joi.object({requested: Joi.boolean().required()}).label("PasswordlessLoginResponse"),
            } },
        },
        handler: async (request, h) => {
            const email = (request.payload as any).email;
            try {
                const user = await graph.pullOne(User, u => u.uuid, {where: C`@this.email = ${email}`});
                await authClient.requestPasswordlessLogin({username: user.uuid});
            } catch (err) {
                log.debug(`Passwordless login request failed: ${err}`);
                return h.response({requested: false});
            }
            log.debug(`Passwordless login request for ${email}`);
            return h.response({requested: true});
        },
    },
    ///////////////////////////// Get details of my own account
    {
        method: "GET",
        path: `${prefix}/me`,
        options: {
            description: "Get my public profile data",
            notes: "Get information about the logged in user (or bot)",
            auth: "technotes_strategy",
            validate: {},
        },
        handler: (request, h) => {
            const user = request.auth.credentials.user;
            if (user === undefined) {
                throw Boom.internal("Auth Expected");
            }
            return h.response(getPublicUserData(user.username));
        },
    },
];


/**
 * A helper function to get the profile of a specific user.
 *
 * All information returned by this is considered public.
 */
async function getPublicUserData(username: string): Promise<PublicUserData> {

    // TODO: Create a Vertex Framework Proxy object that allows loading either a Human or a Bot

    if (username === "system") {
        // Special case: the "system" user is neither a human nor a bot.
        return {
            isBot: false,
            fullName: "System (Neolace)",
            username: "system",
        };
    }


    // Until then, try one at a time.
    const key = User.shortIdPrefix + username;  // The user's shortId
    const humanResult = await graph.pull(HumanUser, u => u.fullName.username(), {key,});
    if (humanResult.length === 1) {
        // This is a human user
        return {
            isBot: false,
            fullName: humanResult[0].fullName,
            username: humanResult[0].username,
        };
    } else if (humanResult.length > 1) { throw Boom.internal("Inconsistent - Multiple users matched"); }

    const botResult = await graph.pull(BotUser, u => u.fullName.username().ownedBy(h => h.username()), {key, });
    if (botResult.length === 0) {
        throw Boom.notFound(`No user found with the username "${username}".`);
    } else if (botResult.length > 1) { throw Boom.internal("Inconsistent - Multiple users matched"); }

    // This is a bot user:
    return {
        isBot: true,
        fullName: botResult[0].fullName,
        username: botResult[0].username,
        ownedByUsername: botResult[0].ownedBy?.username || "",  // Should never actually be null/""; an owner is required
    };
}
