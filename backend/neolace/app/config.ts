/**
 * @file Configuration of the Neolace backend application
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */

/** What type of environment this is: development, production, or testing */
export const environment = (Deno.env.get("ENV_TYPE") as "production" | "development" | "test" | undefined) ||
    "development";
if (!["production", "development", "test"].includes(environment)) {
    throw new Error(`Invalid ENV_TYPE: ${environment}`);
}

function defaultTo<T>(value: T, { production, test }: { production?: T; test?: T }): T {
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
        // Port to listen on
        port: defaultTo(5554, { test: 4444 }),
        // Full URL at which the REST API is available
        apiUrl: defaultTo("http://local.neolace.net:5554", { test: "http://localhost:4444" }),
        // To create the full URL to a site, prefix this before the domain:
        siteUrlPrefix: defaultTo("http://", { production: "https://" }),
        // To create the full URL to a site's frontend, prefix this after the domain:
        siteUrlSuffix: defaultTo(":5555", { production: "", test: ":4445" }),

        /**
         * The key of the "home site" for this Realm. Every Realm has a home site, which is the site where users
         * log in, manage their account, and from where authorized users can create additional sites (if enabled).
         */
        realmHomeSiteId: "home",
        /** Physical address of the organization whose realm this is. Required for outbound emails. */
        realmPhysicalAddress: "317 - 161 West Georgia St.\nVancouver, BC  Canada",

        // Frontend domains - currently only used for authn to set the audience of the JWTs that it issues:
        frontendDomains: ["*.local.neolace.net:5555"],

        // URL of the Neo4j server
        neo4jUrl: defaultTo("bolt://localhost:7687", { test: "bolt://localhost:4687" }),
        neo4jDatabase: "neo4j",
        neo4jUser: "neo4j",
        neo4jPassword: defaultTo("neolace", { production: "\u0000 setme!!" }),
        // Configuration of the TypeSense (search) server:
        typeSenseHost: "localhost",
        typeSensePort: defaultTo(5556, { production: 8108 }),
        typeSenseProtocol: "http",
        typeSenseApiKey: "typesensedevkey",
        typeSensePublicEndpoint: "http://localhost:5556",
        // Should debug logs be printed to stdout?
        debugLogging: defaultTo(true, { production: false }),
        // Public URL of the authentication microservice (Keratin AuthN). Note it doesn't actually use HTTPS for local
        // dev, but it does use secure cookies, and browsers treat it as secure since it's localhost.
        authnUrl: defaultTo("https://local.neolace.net:5552", { test: "http://localhost:5552" }),
        // Private URL of the authentication microservice (Keratin AuthN)
        authnPrivateUrl: defaultTo("http://localhost:5559", { test: "http://localhost:4449" }),
        // Username for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiUsername: "authn",
        // Password for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiPassword: "neolace",

        // Which email provider to use for sending transactional email. See deno-mailer.ts.
        mailProvider: "console", // By default just log emails to the console.
        // Detailed provider configuration depends on which provider is selected.
        mailProviderConfig: {},
        /** Address which most system transactional emails will come from. */
        mailFromAddress: "neolace@example.com",

        // S3-compatible object store used for assets like images, PDFs, etc.
        objStoreEndpointURL: "http://localhost:9000/",
        objStoreRegion: "dev-region",
        // The default bucket names below are created by the entrypoint in docker-compose.yml
        objStoreBucketName: defaultTo("neolace-objects", { test: "neolace-test-objects" }),
        objStoreAccessKey: "AKIA_NEOLACE_DEV",
        objStoreSecretKey: "neolace123",
        objStorePublicUrlPrefix: defaultTo("http://localhost:9000/neolace-objects", {
            test: "http://localhost:9000/neolace-test-objects",
        }),
        // If set, this prefix will be used for images, instead of objStorePublicUrlPrefix. Useful for CDN+imgproxy.
        objStorePublicUrlPrefixForImages: "",
        // Redis is used as a cache and a message queue
        redisHostname: "localhost",
        redisPassword: defaultTo("devpassword", { production: "" }),
        redisDatabaseNumber: defaultTo(0, { test: 1 }),
        redisPort: defaultTo(5553, { production: 6379 }),
        // The system API key is very dangerous and allows a user to do ANYTHING with the REST API, such as delete
        // entire sites. We store only the salted SHA-256 hash of the system API key. It defaults to
        // "SYS_KEY_INSECURE_DEV_KEY" in development and by default is disabled in production. Go to
        // (backend API URL)/auth/system-key to generate a ney key, e.g. http://localhost:5554/auth/system-key for
        // development. Once it is generated, this config setting here must be updated.
        systemApiKeyHash: defaultTo("96dee7f604222fed743cec02d8be06ca531b7187dc96adc3f7d4dcad011025fc", {
            production: "disabled",
        }),

        plugins: [
            { mod: "external-image" },
            { mod: "search" },
            { mod: "push-connection" },
        ],
    };
    // Allow defaults to be overriden by environment variables:
    for (const key in config) {
        const value = Deno.env.get(key);
        if (value !== undefined) {
            try {
                // Use JSON parsing to get nicely typed values from env vars:
                // deno-lint-ignore no-explicit-any
                (config as any)[key] = JSON.parse(value);
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
    const rootUrls = ["apiUrl", "authnUrl", "authnPrivateUrl"] as const;
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
    }
    return Object.freeze(config);
})();
