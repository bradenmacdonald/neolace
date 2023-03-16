#!/usr/bin/env deno run --allow-env --allow-net --allow-read --allow-write --no-lock
/**
 * @file Admin script for Neolace.
 *
 * This script will connect to a Neolace realm's REST API, and can perform admin tasks, like import/export of schema or
 * content.
 *
 * This script gets its connection and authentication information from environment variables. If you use it frequently,
 * it is recommended that you create a wrapper script for each realm that you administer.
 *
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { exportCommand } from "./commands/export.ts";
import { importSchemaAndContent } from "./commands/import.ts";
import { syncSchema } from "./commands/sync-schema.ts";
import { getApiClientFromEnv, log, readAll } from "./deps.ts";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Usage instructions

function dieUsage(code = 1): never {
    console.log(`
Usage: neolace-admin.ts [command] [args]

Where command is one of:
    export-schema site_id
        Export a site's schema to a YAML (on stdout)
    export site_id [folder_name]
        Export all of a site's schema and content to the specified folder; if not specified, a folder in the current
        directory with the same name as the site ID will be used.
    sync-schema site_id
        Import a site schema from YAML (on stdin). This can be dangerous as it will erase any parts of the existing
        schema that aren't part of the imported schema (in other words, it overwrites the schema).
    import site_id [folder_name]
        Import the schema and content from a folder into the site with the specified ID. The site must already exist but
        should not have any entries. If a folder name is not given, it will be assumed to be a folder in the current
        directory with the same name as the site ID.
    erase-content site_id [--skip-prompt-and-dangerously-delete]
        Erase all content on the specified site. This is dangerous!
`);
    Deno.exit(code);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main

if (import.meta.main) {
    // Configure logging:
    await log.setup({
        handlers: {
            console: new log.handlers.ConsoleHandler("DEBUG"),
        },
        loggers: {
            "neolace-sdk": { level: "INFO", handlers: ["console"] },
            "neolace-admin": { level: "INFO", handlers: ["console"] },
        },
    });
    // Parse arguments:
    switch (Deno.args[0]) {
        case "export-schema": {
            const siteKey = Deno.args[1];
            if (!siteKey) {
                dieUsage();
            }
            await exportCommand({ siteKey, exportSchema: true, exportContent: false });
            break;
        }
        case "export": {
            const siteKey = Deno.args[1];
            if (!siteKey) {
                dieUsage();
            }
            const outFolder = Deno.args[2] ?? siteKey;
            await exportCommand({ siteKey, exportSchema: true, exportContent: true, outFolder });
            break;
        }
        case "sync-schema": {
            const siteKey = Deno.args[1];
            if (!siteKey) {
                dieUsage();
            }
            const stdinContent = await readAll(Deno.stdin);
            const schemaYaml = new TextDecoder().decode(stdinContent);
            await syncSchema(siteKey, schemaYaml);
            break;
        }
        case "import": {
            const siteKey = Deno.args[1];
            if (!siteKey) {
                dieUsage();
            }
            const sourceFolder = Deno.args[2] ?? siteKey;
            await importSchemaAndContent({ siteKey, sourceFolder });
            break;
        }
        case "erase-content": {
            const siteKey = Deno.args[1];
            if (!siteKey) {
                dieUsage();
            }
            if (Deno.args[2]) {
                if (Deno.args[2] !== "--skip-prompt-and-dangerously-delete") {
                    dieUsage();
                }
                // Skip the confirmation prompt
            } else {
                if (!confirm("Are you sure you want to delete all content on this site? This is very dangerous.")) {
                    Deno.exit(0);
                }
            }
            const client = await getApiClientFromEnv();
            log.warning("Deleting all entries");
            await client.eraseAllEntriesDangerously({ siteKey, confirm: "danger" });
            log.info("All entries deleted.");
            break;
        }
        default:
            dieUsage(0);
    }
}
