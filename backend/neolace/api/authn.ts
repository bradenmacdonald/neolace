import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";

import { KeratinAuthNClient } from "authn-node";
import { C } from "neolace/deps/vertex-framework.ts";

import { config } from "../app/config";
import { log } from "../app/log";
import { BotUser, HumanUser } from "../core/User";
import { graph } from "../core/graph";

export const authClient = new KeratinAuthNClient({
    appDomain: "localhost:5555",
    authnUrl: config.authnUrl,
    authnPrivateUrl: config.authnPrivateUrl,
    username: config.authnApiUsername,
    password: config.authnApiPassword,
    debugLogger: log.debug,
});

/** Authentication scheme that integrates the Keratin AuthN Microservice into the hapi web server framework */
export const authnScheme: Hapi.ServerAuthScheme = function (server, options) {

    const authenticate: Hapi.ServerAuthSchemeObject["authenticate"] = async (request, h) => {
        // Note: we return HTTP 401 if the authentication is invalid, because despite the name, it's about
        // Authentication and HTTP 403 is about authorization.
        const authHeader = request.headers.authorization;
        if (authHeader === undefined) {
            throw Boom.unauthorized("Authorization header (and JWT token) is required.")
        }
        if (!authHeader.startsWith("Bearer ")) {
            throw Boom.unauthorized("Authorization header is not a bearer token.")
        }
        const authToken = authHeader.substr(7);
        if (authToken.includes(".")) {
            // This is a JWT, used to authenticate a human user who has logged in with the app / our authn microservice:
            const authInfo = await authClient.validateSessionToken(authToken);
            if (authInfo === undefined) {
                throw Boom.unauthorized("Authorization token is invalid or expired.")
            }

            const user = await graph.pullOne(HumanUser, u => u.allProps.username(), {where: C`@this.authnId = ${authInfo.accountId}`});

            const credentials = {
                user: {
                    isBot: false,
                    id: user.id,
                    authnId: authInfo.accountId,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                },
            }
            return h.authenticated({ credentials, artifacts: {} });
        } else {
            const users = await graph.pull(BotUser, u => u.id.fullName.username(), {where: C`@this.authToken = ${authToken}`});
            if (users.length > 1) {
                throw Boom.internal("Multiple users matched same auth token!");
            } else if (users.length === 0) {
                throw Boom.unauthorized("That bot's API authorization token is invalid or revoked.");
            }
            const user = users[0];
            const credentials = {
                user: {
                    isBot: true,
                    id: user.id,
                    authnId: undefined,
                    username: user.username,
                    email: "",
                    fullName: user.fullName,
                },
            }
            return h.authenticated({ credentials, artifacts: {} });
        }
    };

    return {
        authenticate,
    };
}
