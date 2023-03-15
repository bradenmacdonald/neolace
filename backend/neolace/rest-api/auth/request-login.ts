/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { getGraph, log, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { HumanUser } from "neolace/core/User.ts";

export class RequestLoginResource extends NeolaceHttpResource {
    public paths = ["/auth/request-login"];

    POST = this.method({
        requestBodySchema: SDK.schemas.Schema({ email: Field.validators.email }),
        responseSchema: SDK.schemas.Schema({ requested: SDK.schemas.boolean }),
        description: "Request passwordless login",
    }, async ({ bodyData }) => {
        const graph = await getGraph();
        const { email } = bodyData;
        try {
            const user = await graph.pullOne(HumanUser, (u) => u.id.authnId, { with: { email } });
            if (user.authnId < 0) {
                throw new SDK.InvalidFieldValue([{
                    fieldPath: "email",
                    message: (
                        `Built-in/system users cannot use passwordless login ` +
                        `as they are not registered with our authentication microservice.`
                    ),
                }]);
            }
            await authClient.requestPasswordlessLogin({ username: user.id });
        } catch (err) {
            log.error(`Passwordless login request for ${email} failed.`);
            if (err instanceof EmptyResultError) {
                // This user doesn't exist:
                return { requested: false };
            }
            throw err; // Some other internal error
        }
        log.info(`Passwordless login request for ${email}`);
        return { requested: true };
    });
}
