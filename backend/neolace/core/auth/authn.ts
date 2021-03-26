import * as Hapi from "@hapi/hapi";
import * as Boom from "@hapi/boom";

import { KeratinAuthNClient } from "authn-node";
import { C } from "vertex-framework";

import { config } from "../../app/config";
import { log } from "../../app/log";
import { User } from "../User";
import { graph } from "../graph";

export const authClient = new KeratinAuthNClient({
    appDomain: config.frontendDomain,
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
        const authInfo = await authClient.validateSessionToken(authToken);
        if (authInfo === undefined) {
            throw Boom.unauthorized("Authorization token is invalid or expired.")
        }

        const user = await graph.pullOne(User, u => u.allProps, {where: C`@this.authnId = ${authInfo.accountId}`});

        const credentials = {
            user: {
                uuid: user.uuid,
                authnId: authInfo.accountId,
                username: user.shortId,
                email: user.email,
                realname: user.realname,
                country: user.country,
            },
        }
        return h.authenticated({ credentials, artifacts: {} });
    };

    return {
        authenticate,
    };
}
