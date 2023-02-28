import { NeolaceApiClient } from "./client.ts";
import { NotAuthenticated } from "./errors.ts";
import * as log from "https://deno.land/std@0.170.0/log/mod.ts";

let _apiClientPromise: Promise<NeolaceApiClient> | undefined = undefined;

/**
 * This is a helper for Deno command line applications, to get an API client that can connect to whatever instance of
 * Neolace is configured by the NEOLACE_API_ENDPOINT and NEOLACE_API_KEY environment variables.
 * @returns 
 */
export async function getApiClientFromEnv(): Promise<NeolaceApiClient> {
    if (_apiClientPromise !== undefined) {
        return _apiClientPromise;
    }
    return _apiClientPromise = (async () => {
        const apiEndpoint = Deno.env.get("NEOLACE_API_ENDPOINT") ?? "http://local.neolace.net:5554";
        if (!apiEndpoint.startsWith("http")) {
            log.error("You must set NEOLACE_API_ENDPOINT to a valid http:// or https:// URL for the Neolace realm.");
            Deno.exit(1);
        }
        const apiKey = Deno.env.get("NEOLACE_API_KEY") ?? "SYS_KEY_INSECURE_DEV_KEY";

        const client = new NeolaceApiClient({
            basePath: apiEndpoint,
            fetchApi: fetch,
            authToken: apiKey,
        });

        try {
            await client.checkHealth();
        } catch (err) {
            if (err instanceof NotAuthenticated) {
                log.error(`unable to authenticate with Neolace API server ${apiEndpoint}. Check your API key.`);
                Deno.exit(1);
            } else {
                log.error(`Neolace API server ${apiEndpoint} is not accessible or not healthy.`);
                throw err;
            }
        }
        return client;
    })();
}
