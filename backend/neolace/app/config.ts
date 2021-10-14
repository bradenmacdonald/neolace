/**
 * Configuration of the TechNotes backend application
 */

// What type of environment this is: development, production, or testing
export const environment = (Deno.env.get("ENV_TYPE") as "production"|"development"|"test"|undefined) || "development";
if (!["production", "development", "test"].includes(environment)) {
    throw new Error(`Invalid ENV_TYPE: ${environment}`);
}

function defaultTo<T>(value: T, {production, test}: {production?: T, test?: T}): T {
    if (environment === "production") {
        return production ?? value;
    } else if (environment === "test") {
        return test ?? value;
    }
    return value;
}

export const config = (() => {
    // Default configuration:
    const config = {

        // The REST API

        // Port to listen on
        port: defaultTo(5554, {test: 4444}),
        // Full URL at which the REST API is available
        apiUrl: defaultTo("http://local.neolace.net:5554", {test: "http://localhost:4444"}),

        /**
         * URL for the Realm admin UI. This is where you can create a new site, register a user account, etc.
         */
        realmAdminUrl: defaultTo("http://local.neolace.net:5555", {test: "http://frontend-realm-admin"}),


        // URL of the Neo4j server
        neo4jUrl: defaultTo("bolt://localhost:7687", {test: "bolt://localhost:4687"}),
        neo4jUser: "neo4j",
        neo4jPassword: defaultTo("neolace", {production: "\u0000 setme!!"}),
        // Should debug logs be printed to stdout?
        debugLogging: defaultTo(true, {production: false}),
        // Public URL of the authentication microservice (Keratin AuthN)
        authnUrl: defaultTo("http://localhost:5552", {test: "http://localhost:5552"}),
        // Private URL of the authentication microservice (Keratin AuthN)
        authnPrivateUrl: defaultTo("http://localhost:5559", {test: "http://localhost:4449"}),
        // Username for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiUsername: "authn",
        // Password for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiPassword: "neolace",
        // S3-compatible object store used for assets like images, PDFs, etc.
        objStoreEndpointURL: "http://localhost:9000/",
        objStoreRegion: "dev-region",
        // The default bucket names below are created by the entrypoint in docker-compose.yml
        objStoreBucketName: defaultTo("neolace-objects", {test: "neolace-test-objects"}),
        objStoreAccessKey: "AKIA_NEOLACE_DEV",
        objStoreSecretKey: "neolace123",
        objStorePublicUrlPrefix: defaultTo("http://localhost:9000/neolace-objects", {test: "http://localhost:9000/neolace-test-objects"}),
    };
    // Allow defaults to be overriden by environment variables:
    for (const key in config) {
        const value = Deno.env.get(key);
        if (value !== undefined) {
            try {
                // Use JSON parsing to get nicely typed values from env vars:
                // deno-lint-ignore no-explicit-any
                (config as any)[key] = JSON.parse(value)
            } catch (err) {
                // Though JSON parsing will fail if it's just a regular unquoted string:
                if (err instanceof SyntaxError) {
                    // deno-lint-ignore no-explicit-any
                    (config as any)[key] = value; // It's a string value
                } else {
                    throw err;
                }
            }
        }
    }
    // Sanity checks
    const rootUrls = ["realmAdminUrl", "apiUrl", "authnUrl", "authnPrivateUrl"] as const;
    for (const url of rootUrls) {
        if (config[url].endsWith("/")) {
            throw new Error(`${url} must not end with a /`);
        }
    }
    if (environment === "production") {
        // Enforce HTTPS
        if (!config.apiUrl.startsWith("https://")) {
            throw new Error("In production, apiUrl must be https://");
        }
        if (!config.realmAdminUrl.startsWith("https://")) {
            throw new Error("In production, frontendUrl must be https://");
        }
    }
    return Object.freeze(config);
})();
