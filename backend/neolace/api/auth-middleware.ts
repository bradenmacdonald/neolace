import { authClient } from "neolace/core/authn-client.ts";
import { C } from "neolace/deps/vertex-framework.ts";

import { Drash, graph, NeolaceHttpRequest } from "./mod.ts";
import { BotUser, HumanUser } from "../core/User.ts";

export class NeolaceAuthService extends Drash.Service {
    public async runBeforeResource(request: Drash.Request): Promise<void> {
        // Note: we return HTTP 401 if the authentication is invalid, because despite the name, it's about
        // Authentication and HTTP 403 is about authorization.
        const authHeader = request.headers.get("authorization");
        if (authHeader === null) {
            // No user has tried to authenticate; this is an anonymous request.
            return;
        }
        if (!authHeader.startsWith("Bearer ")) {
            throw new Drash.Errors.HttpError(401, "Authorization header is not a bearer token.");
        }
        const authToken = authHeader.substr(7);
        if (authToken.includes(".")) {
            // This is a JWT, used to authenticate a human user who has logged in with the app / our authn microservice:
            const authInfo = await authClient.validateSessionToken(authToken);
            if (authInfo === undefined) {
                throw new Drash.Errors.HttpError(401, "Authorization token is invalid or expired.");
            }

            const user = await graph.pullOne(HumanUser, (u) => u.allProps.username(), {
                where: C`@this.authnId = ${authInfo.accountId}`,
            });

            (request as NeolaceHttpRequest).user = {
                isBot: false,
                id: user.id,
                authnId: authInfo.accountId,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
            };
        } else {
            const users = await graph.pull(BotUser, (u) => u.id.fullName.username(), {
                where: C`@this.authToken = ${authToken}`,
            });
            if (users.length > 1) {
                throw new Error("Multiple users matched same auth token!");
            } else if (users.length === 0) {
                throw new Drash.Errors.HttpError(401, "That bot's API authorization token is invalid or revoked.");
            }
            const user = users[0];
            (request as NeolaceHttpRequest).user = {
                isBot: true,
                id: user.id,
                authnId: undefined,
                username: user.username,
                email: "",
                fullName: user.fullName,
            };
        }
    }
}
