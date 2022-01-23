export * from "neolace/lib/tests.ts";
import * as api from "neolace/deps/neolace-api.ts";
export { api };
import { serverPromise } from "neolace/api/server.ts";
import { config } from "neolace/app/config.ts";

/**
 * Get an instance of the API client, to use for testing.
 * @param user One of the default users,
 * @returns
 */
export async function getClient(
    user?: { bot: { authToken: string } },
    siteShortId?: string,
): Promise<api.NeolaceApiClient> {
    await serverPromise;
    return new api.NeolaceApiClient({
        basePath: config.apiUrl,
        fetchApi: fetch,
        authToken: user?.bot.authToken,
        siteId: siteShortId,
    });
}
