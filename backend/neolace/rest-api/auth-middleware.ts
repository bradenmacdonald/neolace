/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { authClient } from "neolace/core/authn-client.ts";
import { EmptyResultError, SYSTEM_VNID } from "neolace/deps/vertex-framework.ts";

import { config } from "neolace/app/config.ts";
import { log } from "neolace/app/log.ts";
import { Drash, getGraph, NeolaceHttpRequest } from "./mod.ts";
import { BotUser, HumanUser } from "neolace/core/User.ts";
import { bin2hex } from "neolace/lib/bin2hex.ts";
import { sha256hmac } from "neolace/lib/sha256hmac.ts";

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
        const graph = await getGraph();
        const authToken = authHeader.substring(7);
        if (authToken.includes(".")) {
            // This is a JWT, used to authenticate a human user who has logged in with the app / our authn microservice:
            const authInfo = await authClient.validateSessionToken(authToken);
            if (authInfo === undefined) {
                throw new Drash.Errors.HttpError(401, "Authorization token is invalid or expired.");
            }

            let user;
            try {
                user = await graph.pullOne(HumanUser, (u) => u.allProps, {
                    with: { authnId: authInfo.accountId },
                });
            } catch (err) {
                if (err instanceof EmptyResultError) {
                    log.error(
                        `User had a valid token for AuthN account ${authInfo.accountId}, but no matching user was found`,
                    );
                    return;
                }
                throw err;
            }

            (request as NeolaceHttpRequest).user = {
                isBot: false,
                id: user.id,
                authnId: authInfo.accountId,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
            };
        } else if (authToken.startsWith("SYS_KEY_")) {
            // This is a system API key, which gives full access to do anything (like a root user)
            if (config.systemApiKeyHash && config.systemApiKeyHash !== "disabled") {
                // TODO: rate limit this API endpoint
                if (await hashSystemKey(authToken) === config.systemApiKeyHash) {
                    (request as NeolaceHttpRequest).user = {
                        isBot: true,
                        id: SYSTEM_VNID,
                        authnId: undefined,
                        username: "system",
                        email: "",
                        fullName: "System",
                    };
                } else {
                    throw new Drash.Errors.HttpError(401, "That bot's API authorization token is invalid or revoked.");
                }
            }
        } else {
            const users = await graph.pull(BotUser, (u) => u.id.fullName.username, { with: { authToken } });
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

async function getSystemKeySalt(): Promise<Uint8Array> {
    return new TextEncoder().encode("NEOLACE😎&SALT0001");
}

export async function hashSystemKey(key: string): Promise<string> {
    const salt: Uint8Array = await getSystemKeySalt();
    return bin2hex(await sha256hmac(salt, key));
}
