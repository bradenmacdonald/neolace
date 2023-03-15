/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
export * from "neolace/lib/tests.ts";
import { afterAll, beforeAll, group as realGroup } from "neolace/lib/tests.ts";
import * as SDK from "neolace/deps/neolace-sdk.ts";
export { SDK };
import { startServer, stopServer } from "neolace/rest-api/server.ts";
import { config } from "neolace/app/config.ts";

let level = 0;
export function group(name: string, tests: () => unknown) {
    realGroup(name, () => {
        if (level === 0) {
            beforeAll(async () => {
                await startServer();
            });
            afterAll(async () => {
                await stopServer();
            });
        }
        level++;
        tests();
        level--;
    });
}

/**
 * Get an instance of the API client, to use for testing.
 * @param user One of the default users,
 * @returns
 */
export async function getClient(
    user?: { bot: { authToken: string } },
    siteKey?: string,
): Promise<SDK.NeolaceApiClient> {
    return new SDK.NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: user?.bot.authToken,
        siteKey,
    });
}

/**
 * Return an API client that is authenticated as the system user, so it can run realm adminsitration tasks.
 */
export async function getSystemClient(): Promise<SDK.NeolaceApiClient> {
    return new SDK.NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: "SYS_KEY_INSECURE_DEV_KEY",
    });
}
