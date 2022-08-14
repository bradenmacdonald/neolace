export * from "neolace/lib/tests.ts";
import { afterAll, beforeAll, group as realGroup } from "neolace/lib/tests.ts";
import * as api from "neolace/deps/neolace-api.ts";
export { api };
import { startServer, stopServer } from "neolace/api/server.ts";
import { config } from "neolace/app/config.ts";

let level = 0;
export function group(name: string, tests: () => unknown) {
    realGroup(name, () => {
        if (level === 0) {
            beforeAll(async () => {
                console.log("Starting server...");
                await startServer();
                console.log("Started server");
            });
            afterAll(async () => {
                console.log("stopping server...");
                await stopServer();
                console.log("Server stopped");
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
    siteShortId?: string,
): Promise<api.NeolaceApiClient> {
    return new api.NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: user?.bot.authToken,
        siteId: siteShortId,
    });
}

/**
 * Return an API client that is authenticated as the system user, so it can run realm adminsitration tasks.
 */
export async function getSystemClient(): Promise<api.NeolaceApiClient> {
    return new api.NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: "SYS_KEY_INSECURE_DEV_KEY",
    });
}
