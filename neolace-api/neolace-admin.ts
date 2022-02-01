#!/usr/bin/env deno run --allow-env --allow-net --allow-read --allow-write --no-check
/**
 * Admin script for Neolace.
 *
 * This script will connect to a Neolace realm's REST API, and can perform admin tasks, like import/export of schema or
 * content.
 *
 * This script gets its connection and authentication information from environment variables. If you use it frequently,
 * it is recommended that you create a wrapper script for each realm that you administer.
 */
import * as api from "./src/index.ts";
import * as log from "https://deno.land/std@0.120.0/log/mod.ts";
// import { parse as parseArgs } from "https://deno.land/std@0.120.0/flags/mod.ts";
import { parse as parseYaml, stringify as stringifyYaml, } from "https://deno.land/std@0.120.0/encoding/yaml.ts";
import { VNID } from "https://raw.githubusercontent.com/neolace-dev/vertex-framework/f5e5a577518307d609ded1e16aa7f1fe1cb02b64/vertex/lib/types/vnid.ts";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Usage instructions

function dieUsage(code = 1): never {
    console.log(`
Usage: neolace-admin.ts [command] [args]

Where command is one of:
    export schema site_id
        Export a site's schema to a YAML (on stdout)
    export all site_id [folder_name]
        Export all of a site's schema and content to the specified folder; if not specified, a folder in the current
        directory with the same name as the site ID will be used.
`);
    Deno.exit(code);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Get the API client

let _apiClientPromise: Promise<api.NeolaceApiClient> | undefined = undefined;

async function getApiClient(): Promise<api.NeolaceApiClient> {
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

        const client = new api.NeolaceApiClient({
            basePath: apiEndpoint,
            fetchApi: fetch,
            authToken: apiKey,
        });

        try {
            await client.checkHealth();
        } catch (err) {
            if (err instanceof api.NotAuthenticated) {
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Export

/**
 * Schema IDs are generally not human-readable, so this function builds a map of human readable IDs that we can use in
 * the exported schema.
 * @param schema 
 */
function buildIdMap(schema: api.SiteSchemaData): Record<string, string> {
    const map: Record<string, string> = {};

    const notSlugRegex = /[^_\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/ug;
    function makeSlug(string: string): string {
        string = string.toUpperCase().trim();
        string = string.replace(notSlugRegex, " ");
        string = string.replace(/[_\s]+/g, "_"); // convert spaces to underscores, eliminate consecutive spaces/underscores
        string = string.replace(/_+$/g, ""); // trim any trailing underscores
        return string;
    }

    for (const entry of Object.values(schema.entryTypes)) {
        // Generate a unique new key
        let friendlyId = `_ET_${makeSlug(entry.name)}`;
        let suffix = 2;
        while (friendlyId in map) {
            friendlyId = `_ET_${makeSlug(entry.name)}${suffix++}`;
        }
        map[friendlyId] = entry.id;
    }
    for (const entry of Object.values(schema.properties)) {
        // Generate a unique new key
        let friendlyId = `_PROP_${makeSlug(entry.name)}`;
        let suffix = 2;
        while (friendlyId in map) {
            friendlyId = `_PROP_${makeSlug(entry.name)}${suffix++}`;
        }
        map[friendlyId] = entry.id;
    }
    return map;
}

/** Given a map of {k: v}, return a map of {v: k} */
function invertMap(map: Record<string, string>) {
    const newMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
        newMap[v] = k;
    }
    return newMap;
}

function applyIdMap(map: Record<string, string>, schema: api.SiteSchemaData, {generateNewIds = false} = {}): {newSchema: api.SiteSchemaData, newMap: Record<string, string>} {
    const newMap = {...map};
    const newSchema: api.SiteSchemaData = {entryTypes: {}, properties: {}};

    const getMappedId = (id: string): VNID => {
        const newId: string|undefined = id in newMap ? newMap[id] : (generateNewIds ? VNID() : undefined);
        if (newId === undefined) {
            throw new Error(`Unable to find an ID for "${id}" in the ID map.`);
        }
        return newId as VNID;
    }
    const replaceAllIds = (someString: string): string => {
        for (const [oldVCId, newVCId] of Object.entries(newMap)) {
            someString = someString.replaceAll(oldVCId, newVCId);
        }
        return someString;
    }

    for (const entry of Object.values(schema.entryTypes)) {
        const newId = getMappedId(entry.id);
        const newEntryType = {...entry, id: newId as VNID };
        if (newEntryType.enabledFeatures?.HeroImage?.lookupExpression) {
            newEntryType.enabledFeatures.HeroImage.lookupExpression = replaceAllIds(newEntryType.enabledFeatures.HeroImage.lookupExpression);
        }
        newSchema.entryTypes[newId] = newEntryType;
    }
    for (const entry of Object.values(schema.properties)) {
        const newId = getMappedId(entry.id);
        const newProperty = {...entry, id: newId as VNID };
        newProperty.appliesTo.forEach((appliesTo, idx) => {
            newProperty.appliesTo[idx].entryType = getMappedId(appliesTo.entryType);
        });
        newProperty.isA?.forEach((isA, idx) => {
            newProperty.isA![idx] = getMappedId(isA);
        });
        if (newProperty.default) {
            newProperty.default = replaceAllIds(newProperty.default);
        }
        if (newProperty.valueConstraint) {
            newProperty.valueConstraint = replaceAllIds(newProperty.valueConstraint);
        }
        newSchema.properties[newId] = newProperty;
    }

    return {newSchema, newMap};
}

/**
 * Export a site's schema to std out or to a file.
 * @param siteId 
 */
async function exportSchema(siteId: string): Promise<string> {
    const client = await getApiClient();
    const schema = await client.getSiteSchema({siteId});
    const idMap = buildIdMap(schema);
    const readableSchema = applyIdMap(invertMap(idMap), schema).newSchema; // Convert IDs to be human readable
    const schemaReformatted = {
        // Remove duplication of IDs (normally the ID is in both each key and each "id" property)
        entryTypes: Object.values(readableSchema.entryTypes),
        properties: Object.values(readableSchema.properties),
        idMap: { comment: "if you edit one of the IDs above, you should edit it below here too. You do not need to add IDs here for new entries.", map: idMap, },
    };
    return stringifyYaml(schemaReformatted);
}

/**
 * This function implements the export command, which can be invoked as
 *     neolace-admin.ts export schema
 *     neolace-admin.ts export all [folder_name]
 */
async function exportCommand() {
    const scope = Deno.args[1];
    if (!["schema", "all"].includes(scope)) {
        dieUsage();
    }
    const siteId = Deno.args[2];
    if (!siteId) {
        dieUsage();
    }
    const shouldExportAll = scope === "all";
    const shouldExportSchema = shouldExportAll || scope === "schema";
    const outFolder = shouldExportAll ? (Deno.args[3] ?? siteId) : undefined;
    if (outFolder) {
        try {
            Deno.readDirSync(outFolder);
            log.error(`Directory "${outFolder}" already exists.`);
            Deno.exit(1);
        } catch {
            await Deno.mkdir(outFolder, {recursive: true});
        }
    }
    // Export the schema:
    if (shouldExportSchema) {
        const schemaYaml = await exportSchema(siteId);
        if (outFolder) {
            await Deno.writeTextFile(`${outFolder}/schema.yaml`, schemaYaml);
        } else {
            // Export the schema to stdout
            console.log(schemaYaml);
        }
    }
    // Export the content:
    if (shouldExportAll) {
        // TODO: export the content
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main

if (import.meta.main) {
    switch (Deno.args[0]) {
        case "export": {
            await exportCommand();
            break;
        }
        default:
            dieUsage(0);
    }
}
