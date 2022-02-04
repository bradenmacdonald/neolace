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
import { readAll } from "https://deno.land/std@0.120.0/streams/conversion.ts";
import { VNID } from "https://raw.githubusercontent.com/neolace-dev/vertex-framework/f5e5a577518307d609ded1e16aa7f1fe1cb02b64/vertex/lib/types/vnid.ts";
import { assertEquals } from "https://deno.land/std@0.120.0/testing/asserts.ts";

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
        if (newEntryType.enabledFeatures) {
            newEntryType.enabledFeatures = {...newEntryType.enabledFeatures}; // Copy so we don't modify the original
            if (newEntryType.enabledFeatures.HeroImage?.lookupExpression) {
                newEntryType.enabledFeatures.HeroImage = {
                    ...newEntryType.enabledFeatures.HeroImage,
                    lookupExpression: replaceAllIds(newEntryType.enabledFeatures.HeroImage.lookupExpression),
                };
            }
        }
        newSchema.entryTypes[newId] = newEntryType;
    }
    for (const entry of Object.values(schema.properties)) {
        const newId = getMappedId(entry.id);
        const newProperty = {...entry, id: newId as VNID };
        newProperty.appliesTo = newProperty.appliesTo.map(
            (old) => ({...old, entryType: getMappedId(old.entryType)}),
        );
        if (newProperty.isA) {
            newProperty.isA = newProperty.isA.map(oldId => getMappedId(oldId));
        }
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

interface FriendlySchema {
    entryTypes: api.EntryTypeData[],
    properties: api.PropertyData[],
    idMap: { comment: string, map: Record<string, string>;}
}

/**
 * Convert a site's schema to a human-readable YAML string.
 * The "normal" schema format is already pretty human-readable, except for the VNIDs which are not. The main purpose of
 * this function is to convert the VNIDs to a human-readable format.
 */
function schemaToYaml(schema: api.SiteSchemaData): string {
    const idMap = buildIdMap(schema);
    const readableSchema = applyIdMap(invertMap(idMap), schema).newSchema; // Convert IDs to be human readable
    const schemaReformatted: FriendlySchema = {
        // Remove duplication of IDs (normally the ID is in both each key and each "id" property)
        entryTypes: Object.values(readableSchema.entryTypes),
        properties: Object.values(readableSchema.properties),
        idMap: { comment: "if you edit one of the IDs above, you should edit it below here too. You do not need to add IDs here for new entries.", map: idMap, },
    };
    // deno-lint-ignore no-explicit-any
    return stringifyYaml(schemaReformatted as any);
}

/**
 * Convert a schema from a human-readable YAML string back to the "normal" schema format.
 * This is the opposite of schemaToYaml()
 */
function yamlToSchema(yamlString: string): {idMap: Record<string, string>, schema: api.SiteSchemaData} {
    const friendlySchema = parseYaml(yamlString) as FriendlySchema;
    // Convert from format where entryTypes/properties are arrays to one where they're values in an object:
    const tempSchema: api.SiteSchemaData = {entryTypes: {}, properties: {}};
    for (const et of friendlySchema.entryTypes) {
        tempSchema.entryTypes[et.id] = et;
    }
    for (const prop of friendlySchema.properties) {
        tempSchema.properties[prop.id] = prop;
    }
    // Convert the friendly IDs back to 
    const {newSchema, newMap} = applyIdMap(friendlySchema.idMap.map, tempSchema);
    return {schema: newSchema, idMap: newMap};
}

async function exportSchema(siteId: string): Promise<string> {
    const client = await getApiClient();
    const schema = await client.getSiteSchema({siteId});
    const yamlSchema = schemaToYaml(schema);
    // Do a quick validation:
    assertEquals(yamlToSchema(yamlSchema).schema, schema);
    return yamlSchema
}

/**
 * Import a site's schema from a human-readable YAML string. This will overwrite the site's current schema so use with
 * caution.
 */
async function syncSchema(siteId: string, schemaString: string): Promise<{idMap: Record<string, string>, schema: api.SiteSchemaData}> {
    const client = await getApiClient();
    const {schema, idMap} = yamlToSchema(schemaString);
    await client.replaceSiteSchema(schema, {siteId});
    return {schema, idMap};
}

/**
 * This function implements the export command, which can be invoked as
 *     neolace-admin.ts export-schema site_id
 *     neolace-admin.ts export site_id [folder_name]
 */
async function exportCommand({siteId, outFolder, ...options}: {siteId: string, exportSchema: boolean, exportContent: boolean, outFolder?: string}) {
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
    if (options.exportSchema) {
        const schemaYaml = await exportSchema(siteId);
        if (outFolder) {
            log.info("Exporting schema");
            await Deno.writeTextFile(`${outFolder}/schema.yaml`, schemaYaml);
        } else {
            // Export the schema to stdout
            console.log(schemaYaml);
        }
    }
    // Export the content:
    if (options.exportContent) {
        const client = await getApiClient();
        const schema = await client.getSiteSchema({siteId});
        // Map from VNID to a friendlier entry/property ID used for export purposes only:
        const friendlyIds = invertMap(buildIdMap(schema));

        // Add friendly IDs of all the entries too:
        for await (const record of await client.getEntries({siteId})) {
            friendlyIds[record.id] = record.friendlyId;
        }

        for (const entryType of Object.values(schema.entryTypes)) {
            const thisEntryTypeDir = outFolder + '/' + friendlyIds[entryType.id].substring(4).toLowerCase();
            await Deno.mkdir(thisEntryTypeDir);
            for await (const record of await client.getEntries({siteId, ofEntryType: entryType.id})) {
                log.info(`Exporting ${entryType.name} ${record.friendlyId}`)
                const metadata: Record<string, unknown> = {
                    name: record.name,
                    id: record.id,
                };

                const entryData = await client.getEntry(record.id, {siteId, flags: [api.GetEntryFlags.IncludeFeatures, api.GetEntryFlags.IncludeRawProperties] as const});

                if (entryData.description) {
                    metadata.description = replaceIdsInMarkdownAndLookupExpressions(friendlyIds, entryData.description);
                }
                if (entryType.enabledFeatures.Image && entryData.features?.Image) {
                    const imgMeta = entryData.features.Image;
                    const data = await (await fetch(imgMeta.imageUrl)).arrayBuffer();
                    const ext = (
                        imgMeta.contentType === "image/jpeg" ? "jpg" :
                        imgMeta.contentType === "image/webp" ? "webp" :
                        imgMeta.contentType === "image/png" ? "png" :
                        "???"
                    );
                    const imgFilename = record.friendlyId + ".img." + ext; // The ".img" makes the filenames sort consistently with markdown first, then image file next. Otherwise JPG comes before MD but WEBP comes after.
                    await Deno.writeFile(thisEntryTypeDir + '/' + imgFilename, new Uint8Array(data));
                    metadata.image = imgFilename;
                }

                for (const prop of entryData.propertiesRaw!) {
                    if (prop.facts.length === 1 && !prop.facts[0].note && !prop.facts[0].slot) {
                        metadata[friendlyIds[prop.propertyId]] = replaceIdsInMarkdownAndLookupExpressions(friendlyIds, prop.facts[0].valueExpression);
                    } else {
                        const factsSimplified = prop.facts.map((origFact) => {
                            const simpleFact: Record<string, unknown> = {...origFact};
                            simpleFact.valueExpression = replaceIdsInMarkdownAndLookupExpressions(friendlyIds, simpleFact.valueExpression as string);
                            if (!simpleFact.note) {
                                delete simpleFact.note;
                            } else {
                                simpleFact.note = replaceIdsInMarkdownAndLookupExpressions(friendlyIds, simpleFact.note as string);
                            }
                            if (!simpleFact.slot) {
                                delete simpleFact.slot;
                            }
                            delete simpleFact.rank; // Rank is implied by the ordering in the list so we don't need it
                            return simpleFact;
                        });
                        metadata[friendlyIds[prop.propertyId]] = factsSimplified;
                    }
                }

                let markdown = `---\n${stringifyYaml(metadata, {lineWidth: 120})}---\n`;
                if (entryType.enabledFeatures.Article !== undefined) {
                    const articleMd = replaceIdsInMarkdownAndLookupExpressions(friendlyIds, entryData.features?.Article?.articleMD!);
                    markdown += articleMd + "\n";
                }
                await Deno.writeTextFile(thisEntryTypeDir + '/' + record.friendlyId + '.md', markdown);
            }
        }
    }
}


/**
 * Import schema and content from a folder
 */
async function importSchemaAndContent({siteId, sourceFolder}: {siteId: string, sourceFolder: string}) {
    const client = await getApiClient();
    // First, sync the schema
    const schemaYaml = await Deno.readTextFile(sourceFolder + "/schema.yaml").catch(() => {
        log.error(`Required file "${sourceFolder}/schema.yaml" not found. Did you specify the wrong directory name?`);
        Deno.exit(1);
    });
    const { schema, idMap } = await syncSchema(siteId, schemaYaml);
    // The inverse map goes from VNID to human readable ID:
    const inverseMap = invertMap(idMap);

    // There should be one subfolder for each entry type, though some folders may not exist if there were no entries of
    // that type.
    const entryTypes = Object.values(schema.entryTypes)
        .map(et => ({
            folder: `${sourceFolder}/` + inverseMap[et.id].substring(4).toLowerCase(), // Convert the friendly name from "_ET_SOMETHING" to "something"
            entryType: et,
        })).filter(
            (et) => Deno.statSync(et.folder).isDirectory
        );

    async function *iterateEntries() {
        log.info("Scanning entries...");
        for (const {folder, entryType} of entryTypes) {
            for await (const file of Deno.readDir(folder)) {
                if (!file.name.endsWith(".md")) {
                    continue;
                }
                const fileContents = await Deno.readTextFile(`${folder}/${file.name}`);
                const fileParts = fileContents.split(/^---$/m, 3);
                // deno-lint-ignore no-explicit-any
                const metadata = parseYaml(fileParts[1]) as Record<string, any>;
                const articleMd = fileParts[2];
                yield {metadata, articleMd, entryType, friendlyId: file.name.substring(0, file.name.length - 3), folder};
            }
        }
    }

    // First, create each entry with the minimal metadata (no properties)
    {
        const edits: api.AnyContentEdit[] = [];
        for await (const {metadata, friendlyId, entryType} of iterateEntries()) {
            edits.push({
                code: api.CreateEntry.code,
                data: {
                    id: metadata.id ?? VNID(),
                    type: entryType.id,
                    name: metadata.name,
                    description: replaceIdsInMarkdownAndLookupExpressions(idMap, metadata.description),
                    friendlyId: friendlyId,
                },
            });
        }
        log.info("Creating blank entries");
        const {id: draftId} = await client.createDraft({title: "Import Part 1", description: "", edits}, {siteId});
        await client.acceptDraft(draftId, {siteId});
        log.info(`${edits.length} blank entries created`);
    }
}

/**
 * VNIDs are not very human-readable, and must be unique across all sites on a Neolace realm, so for export purposes we
 * generally swap them out for human readable IDs wherever possible. We do still preserve the VNIDs in the export data
 * though, so that if importing back to the same site, we can avoid changing the VNIDs.
 */
function replaceIdsInMarkdownAndLookupExpressions(idMap: Record<string, string>, markdownOrLookup: string) {
    markdownOrLookup = markdownOrLookup.replaceAll(/\[\[\/entry\/(_[0-9A-Za-z_]+)\]\]/mg, (_m, id) => {
        return `[[/entry/${ idMap[id] ?? id }]]`;
    });
    markdownOrLookup = markdownOrLookup.replaceAll(/\[\[\/prop\/(_[0-9A-Za-z_]+)\]\]/mg, (_m, id) => {
        return `[[/prop/${ idMap[id] ?? id }]]`;
    });
    markdownOrLookup = markdownOrLookup.replaceAll(/\]\(\/entry\/(_[0-9A-Za-z_]+)\)/mg, (_m, id) => {
        return `](/entry/${ idMap[id] ?? id })`;
    });
    return markdownOrLookup;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main

if (import.meta.main) {
    switch (Deno.args[0]) {
        case "export-schema": {
            const siteId = Deno.args[1];
            if (!siteId) {
                dieUsage();
            }
            await exportCommand({siteId, exportSchema: true, exportContent: false});
            break;
        }
        case "export": {
            const siteId = Deno.args[1];
            if (!siteId) {
                dieUsage();
            }
            const outFolder = Deno.args[2] ?? siteId;
            await exportCommand({siteId, exportSchema: true, exportContent: true, outFolder});
            break;
        }
        case "sync-schema": {
            const siteId = Deno.args[1];
            if (!siteId) {
                dieUsage();
            }
            const stdinContent = await readAll(Deno.stdin);
            const schemaYaml = new TextDecoder().decode(stdinContent);
            await syncSchema(siteId, schemaYaml);
            break;
        }
        case "import": {
            const siteId = Deno.args[1];
            if (!siteId) {
                dieUsage();
            }
            const sourceFolder = Deno.args[2] ?? siteId;
            await importSchemaAndContent({siteId, sourceFolder});
            break;
        }
        case "erase-content": {
            const siteId = Deno.args[1];
            if (!siteId) {
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
            const client = await getApiClient();
            log.warning("Deleting all entries");
            await client.eraseAllEntriesDangerously({siteId, confirm: "danger"});
            log.info("All entries deleted.");
            break;
        }
        default:
            dieUsage(0);
    }
}
