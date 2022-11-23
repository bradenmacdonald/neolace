#!/usr/bin/env deno run --allow-env --allow-net --allow-read --allow-write --no-lock
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
import * as log from "https://deno.land/std@0.146.0/log/mod.ts";
// import { parse as parseArgs } from "https://deno.land/std@0.146.0/flags/mod.ts";
import { parse as parseYaml, stringify as stringifyYaml } from "https://deno.land/std@0.146.0/encoding/yaml.ts";
import { readAll } from "https://deno.land/std@0.146.0/streams/conversion.ts";
import { VNID } from "https://raw.githubusercontent.com/neolace-dev/vertex-framework/f5e5a577518307d609ded1e16aa7f1fe1cb02b64/vertex/lib/types/vnid.ts";
import { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";

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

interface StreamlinedSchema {
    // These are arrays, not maps, to avoid duplicating the keys:
    entryTypes: api.EntryTypeData[];
    properties: api.PropertyData[];
}

/**
 * Convert a site's schema to a human-readable YAML string.
 * This function used to have to generate human-readable keys but now it's basically a pass-through to stringify()
 */
function schemaToYaml(schema: api.SiteSchemaData): string {
    const schemaOut: StreamlinedSchema = {
        entryTypes: Object.values(schema.entryTypes),
        properties: Object.values(schema.properties),
    };
    // deno-lint-ignore no-explicit-any
    return stringifyYaml(schemaOut as any);
}

/**
 * Convert a schema from a human-readable YAML string back to the "normal" schema format.
 * This is the opposite of schemaToYaml()
 */
function yamlToSchema(yamlString: string): api.SiteSchemaData {
    const schemaStreamlined = parseYaml(yamlString) as StreamlinedSchema;
    const schema: api.SiteSchemaData = {
        entryTypes: Object.fromEntries(schemaStreamlined.entryTypes.map((et) => [et.key, et])),
        properties: Object.fromEntries(schemaStreamlined.properties.map((p) => [p.key, p])),
    };
    // Set some defaults
    for (const entryType of Object.values(schema.entryTypes)) {
        if (entryType.color === undefined) {
            entryType.color = api.EntryTypeColor.Default;
        }
        if (entryType.abbreviation === undefined) {
            entryType.abbreviation = "";
        }
    }
    return schema;
}

async function exportSchema(siteKey: string): Promise<string> {
    const client = await getApiClient();
    const schema = await client.getSiteSchema({ siteKey });
    const yamlSchema = schemaToYaml(schema);
    // Do a quick validation:
    try {
        assertEquals(yamlToSchema(yamlSchema), schema);
    } catch (err) {
        console.error(`Warning: detected that importing the exported schema would have some differences.`, err);
    }
    return yamlSchema;
}

/**
 * Import a site's schema from a human-readable YAML string. This will overwrite the site's current schema so use with
 * caution.
 */
async function syncSchema(
    siteKey: string,
    schemaString: string,
): Promise<api.SiteSchemaData> {
    const client = await getApiClient();
    const schema = yamlToSchema(schemaString);
    await client.replaceSiteSchema(schema, { siteKey });
    return schema;
}

const contentTypes: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/png": "png",
    "application/pdf": "pdf",
    "text/plain": "txt",
};
const extensionFromContentType = (contentType: string) => {
    if (contentType in contentTypes) {
        return contentTypes[contentType];
    }
    throw new Error(`Unknown content type "${contentType}"`);
};
const contentTypeFromExtension = (ext: string) => {
    for (const [ct, e] of Object.entries(contentTypes)) {
        if (e === ext) return ct;
    }
    throw new Error(`Unknown file extension "${ext}"`);
};

/**
 * This function implements the export command, which can be invoked as
 *     neolace-admin.ts export-schema site_id
 *     neolace-admin.ts export site_id [folder_name]
 */
async function exportCommand(
    { siteKey, outFolder, ...options }: {
        siteKey: string;
        exportSchema: boolean;
        exportContent: boolean;
        outFolder?: string;
    },
) {
    if (outFolder) {
        try {
            Deno.readDirSync(outFolder);
            log.error(`Directory "${outFolder}" already exists.`);
            Deno.exit(1);
        } catch {
            await Deno.mkdir(outFolder, { recursive: true });
        }
    }
    // Export the schema:
    if (options.exportSchema) {
        const schemaYaml = await exportSchema(siteKey);
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
        const schema = await client.getSiteSchema({ siteKey });
        // Map from VNID to a friendlier entry/property ID used for export purposes only:
        const keys: Record<VNID, string> = {};

        // Add friendly IDs of all the entries too:
        for await (const record of await client.getEntries({ siteKey })) {
            keys[record.id] = record.key;
        }

        for (const entryType of Object.values(schema.entryTypes)) {
            const thisEntryTypeDir = outFolder + "/" + entryType.key.toLowerCase();
            await Deno.mkdir(thisEntryTypeDir);
            for await (const record of await client.getEntries({ siteKey, ofEntryType: entryType.key })) {
                log.info(`Exporting ${entryType.name} ${record.key}`);
                const metadata: Record<string, unknown> = {
                    name: record.name,
                    id: record.id,
                };

                const entryData = await client.getEntry(record.id, {
                    siteKey,
                    flags: [api.GetEntryFlags.IncludeFeatures, api.GetEntryFlags.IncludeRawProperties] as const,
                });

                if (entryData.description) {
                    metadata.description = replaceIdsInMarkdownAndLookupExpressions(keys, entryData.description);
                }
                if (entryType.enabledFeatures.Image && entryData.features?.Image) {
                    const imgMeta = entryData.features.Image;
                    const data = await (await fetch(imgMeta.imageUrl)).arrayBuffer();
                    const ext = extensionFromContentType(imgMeta.contentType);
                    const imgFilename = record.key + ".img." + ext; // The ".img" makes the filenames sort consistently with markdown first, then image file next. Otherwise JPG comes before MD but WEBP comes after.
                    await Deno.writeFile(thisEntryTypeDir + "/" + imgFilename, new Uint8Array(data));
                    metadata.image = imgFilename;
                    metadata.imageSizing = imgMeta.sizing;
                }
                if (entryType.enabledFeatures.Files && entryData.features?.Files) {
                    const newFilesMeta: Record<string, number> = {};
                    let fileIndex = 1;
                    for (const file of entryData.features.Files.files) {
                        const data = await (await fetch(file.url)).arrayBuffer();
                        const ext = extensionFromContentType(file.contentType);
                        if (ext !== file.filename.split(".").pop()) {
                            throw new Error("Mismatch in content-type vs. extension");
                        }
                        const filename = record.key + `.${fileIndex}.` + ext;
                        await Deno.writeFile(thisEntryTypeDir + "/" + filename, new Uint8Array(data));
                        newFilesMeta[file.filename] = fileIndex;
                        fileIndex++;
                    }
                    metadata.files = newFilesMeta;
                }

                for (const prop of entryData.propertiesRaw!) {
                    if (prop.facts.length === 1 && !prop.facts[0].note && !prop.facts[0].slot) {
                        metadata[prop.propertyKey] = replaceIdsInMarkdownAndLookupExpressions(
                            keys,
                            prop.facts[0].valueExpression,
                        );
                    } else {
                        const factsSimplified = prop.facts.map((origFact) => {
                            const simpleFact: Record<string, unknown> = { ...origFact };
                            simpleFact.valueExpression = replaceIdsInMarkdownAndLookupExpressions(
                                keys,
                                simpleFact.valueExpression as string,
                            );
                            if (!simpleFact.note) {
                                delete simpleFact.note;
                            } else {
                                simpleFact.note = replaceIdsInMarkdownAndLookupExpressions(
                                    keys,
                                    simpleFact.note as string,
                                );
                            }
                            if (!simpleFact.slot) {
                                delete simpleFact.slot;
                            }
                            delete simpleFact.rank; // Rank is implied by the ordering in the list so we don't need it
                            delete simpleFact.id; // We don't include the property fact ID.
                            return simpleFact;
                        });
                        metadata[prop.propertyKey] = factsSimplified;
                    }
                }

                let markdown = `---\n${stringifyYaml(metadata, { lineWidth: 120 })}---\n`;
                if (entryType.enabledFeatures.Article !== undefined) {
                    const articleMd = replaceIdsInMarkdownAndLookupExpressions(
                        keys,
                        entryData.features?.Article?.articleContent!,
                    );
                    markdown += articleMd + "\n";
                }
                await Deno.writeTextFile(thisEntryTypeDir + "/" + record.key + ".md", markdown);
            }
        }
    }
}

/**
 * Import schema and content from a folder
 */
async function importSchemaAndContent({ siteKey, sourceFolder }: { siteKey: string; sourceFolder: string }) {
    const client = await getApiClient();
    // First, sync the schema
    const schemaYaml = await Deno.readTextFile(sourceFolder + "/schema.yaml").catch(() => {
        log.error(`Required file "${sourceFolder}/schema.yaml" not found. Did you specify the wrong directory name?`);
        Deno.exit(1);
    });
    const schema = await syncSchema(siteKey, schemaYaml);

    // There should be one subfolder for each entry type, though some folders may not exist if there were no entries of
    // that type.
    const entryTypes = Object.values(schema.entryTypes)
        .map((et) => ({
            folder: `${sourceFolder}/` + et.key.toLowerCase(),
            entryType: et,
        })).filter(
            (et) => {
                try {
                    return Deno.statSync(et.folder).isDirectory;
                } catch {
                    return false;
                }
            },
        );

    // Iterate over the entries by reading the filesystem. We avoid reading all entries into memory at once in case
    // that would use too much memory.
    async function* iterateEntries() {
        log.info("Scanning entries...");
        for (const { folder, entryType } of entryTypes) {
            for await (const file of Deno.readDir(folder)) {
                if (!file.name.endsWith(".md")) {
                    continue;
                }
                try {
                    const fileContents = await Deno.readTextFile(`${folder}/${file.name}`);
                    const fileParts = fileContents.split(/^---$/m, 3);
                    // deno-lint-ignore no-explicit-any
                    const metadata = parseYaml(fileParts[1]) as Record<string, any>;
                    const articleContent = fileParts[2].trim();
                    yield {
                        metadata,
                        articleContent,
                        entryType,
                        key: file.name.substring(0, file.name.length - 3),
                        folder,
                    };
                } catch (err) {
                    log.error(`Error while trying to parse file ${folder}/${file.name}`);
                    throw err;
                }
            }
        }
    }

    /** Map converting entry keys to VNIDs */
    const idMap: Record<string, VNID> = {};

    // First, loop over all entries and add their IDs to the ID map, assigning new VNIDs where needed
    for await (const { metadata, key } of iterateEntries()) {
        const id = metadata.id ?? VNID();
        if (key in idMap) {
            log.error(`Duplicate key found: ${key}`);
            Deno.exit(1);
        }
        idMap[key] = id;
    }

    // Then, validate that all VNIDs are unique:
    {
        log.info("Checking VNID uniqueness...");
        const allVnids = new Set(Object.values(idMap));
        for (const id of Object.values(idMap)) {
            if (!allVnids.delete(id)) {
                log.error(`Duplicate VNID found: ${id}`);
                Deno.exit(1);
            }
        }
    }

    let part = 1;
    const _pushEdits = async (edits: api.AnyContentEdit[], force = false) => {
        if (edits.length > 20 || (force && edits.length > 0)) {
            const { idNum } = await client.createDraft({ title: `Import Part ${part++}`, description: "", edits }, {
                siteKey,
            });
            await client.acceptDraft(idNum, { siteKey });
            edits.length = 0;
        }
    };
    const pushEdits = (edits: api.AnyContentEdit[]): Promise<void> => _pushEdits(edits, true);
    const pushEditsIfNeeded = (edits: api.AnyContentEdit[]): Promise<void> => _pushEdits(edits);

    // Next, create each entry with the minimal metadata (no properties)
    {
        log.info("Creating blank entries...");
        const edits: api.AnyContentEdit[] = [];
        let numEntries = 0;
        for await (const { metadata, key, entryType } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            edits.push({
                code: api.CreateEntry.code,
                data: {
                    entryId,
                    key,
                    entryTypeKey: entryType.key,
                    name: metadata.name,
                    description: replaceIdsInMarkdownAndLookupExpressions(idMap, metadata.description ?? "", false),
                },
            });
            numEntries++;
            await pushEditsIfNeeded(edits);
        }
        await pushEdits(edits);
        log.info(`${numEntries} blank entries created`);
    }

    {
        log.info("Setting properties...");
        const edits: api.AnyContentEdit[] = [];
        let numEntries = 0;
        let numProperties = 0;
        for await (const { metadata, key } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            // Get the human-readable ID for each property actually used for this entry:
            const propsUsed = Object.keys(metadata).filter((k) => k in schema.properties);
            for (const propertyKey of propsUsed) {
                // Now we need to be able to handle either a list of property facts or a single string value:
                const facts = typeof metadata[propertyKey] === "string"
                    ? [{ valueExpression: metadata[propertyKey] }]
                    : metadata[propertyKey];
                for (const fact of facts) {
                    if (fact.valueExpression === undefined) {
                        throw new Error(`Invalid property value on entry ${entryId} (${key})`);
                    }
                    edits.push({
                        code: api.AddPropertyFact.code,
                        data: {
                            entryId,
                            propertyKey,
                            propertyFactId: VNID(),
                            valueExpression: replaceIdsInMarkdownAndLookupExpressions(idMap, fact.valueExpression),
                            note: fact.note ?? "",
                            slot: fact.slot,
                        },
                    });
                }
                numProperties++;
            }
            numEntries++;
            try {
                await pushEditsIfNeeded(edits);
            } catch (err) {
                if (err instanceof api.InvalidEdit) {
                    throw new Error(`Failed to set properties of entry (${JSON.stringify(err.context)})`, {
                        cause: err,
                    });
                } else {
                    throw new Error(`Failed to set properties of entry`, { cause: err });
                }
            }
        }
        await pushEdits(edits);
        log.info(`${numProperties} properties updated on ${numEntries} entries`);
    }

    // Next, set the markdown article text:
    {
        log.info("Setting article text...");
        const edits: api.AnyContentEdit[] = [];
        let numArticles = 0;
        for await (const { metadata, key, articleContent } of iterateEntries()) {
            if (!articleContent) {
                continue;
            }
            const entryId = metadata.id ?? idMap[key];
            edits.push({
                code: api.UpdateEntryFeature.code,
                data: {
                    entryId,
                    feature: {
                        featureType: "Article",
                        articleContent: replaceIdsInMarkdownAndLookupExpressions(idMap, articleContent, false),
                    },
                },
            });
            numArticles++;
            await pushEditsIfNeeded(edits);
        }
        await pushEdits(edits);
        log.info(`${numArticles} articles updated`);
    }

    // Set images and other files
    {
        log.info("Setting entry files...");

        let draftIdNum: number | undefined;
        const getDraftId = async (): Promise<number> =>
            draftIdNum ?? await client.createDraft(
                { title: `Import Part ${part++}`, description: "", edits: [] },
                { siteKey },
            ).then((d) => draftIdNum = d.idNum);

        let numFiles = 0;
        for await (const { metadata, key, folder } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            if (metadata.image) {
                const fileContents = await Deno.readFile(folder + "/" + metadata.image);
                const extension = metadata.image.split(".").pop();
                const fileBlob = new Blob([fileContents], { type: contentTypeFromExtension(extension) });
                const draftFile = await client.uploadFileToDraft(fileBlob, { idNum: await getDraftId(), siteKey });
                await client.addEditToDraft({
                    code: api.UpdateEntryFeature.code,
                    data: {
                        entryId,
                        feature: {
                            featureType: "Image",
                            draftFileId: draftFile.draftFileId,
                            ...(metadata.imageSizing ? { setSizing: metadata.imageSizing } : {}),
                        },
                    },
                }, { idNum: await getDraftId(), siteKey });
                numFiles++;
            }
            if (metadata.files) {
                for (const [filename, fileIndex] of Object.entries(metadata.files)) {
                    const extension = filename.split(".").pop() as string;
                    const fullFilePath = folder + "/" + key + `.${fileIndex}.${extension}`;
                    const fileContents = await Deno.readFile(fullFilePath).catch((err) => {
                        throw new Error(`Failed to open file ${fullFilePath}`, { cause: err });
                    });
                    const fileBlob = new Blob([fileContents], { type: contentTypeFromExtension(extension) });
                    const draftFile = await client.uploadFileToDraft(fileBlob, { idNum: await getDraftId(), siteKey });
                    await client.addEditToDraft({
                        code: api.UpdateEntryFeature.code,
                        data: {
                            entryId,
                            feature: {
                                featureType: "Files",
                                changeType: "addFile",
                                filename,
                                draftFileId: draftFile.draftFileId,
                            },
                        },
                    }, { idNum: await getDraftId(), siteKey });
                    numFiles++;
                }
            }
        }
        if (draftIdNum !== undefined) {
            await client.acceptDraft(draftIdNum, { siteKey });
            log.info(`${numFiles} files updated`);
        } else {
            log.info(`No files to update.`);
        }
    }
}

/**
 * VNIDs are not very human-readable, and must be unique across all sites on a Neolace realm, so for export purposes we
 * generally swap them out for human readable IDs wherever possible. We do still preserve the VNIDs in the export data
 * though, so that if importing back to the same site, we can avoid changing the VNIDs.
 */
function replaceIdsInMarkdownAndLookupExpressions(
    idMap: Record<string, string>,
    markdownOrLookup: string,
    isExport = true,
) {
    // Literal expressions in lookups:
    if (isExport) { // On import, we want to preserve the keys in this case
        markdownOrLookup = markdownOrLookup.replaceAll(/(?<!\w)entry\("([0-9\p{Alphabetic}_\-]+)"\)/mgu, (_m, id) => {
            return `entry("${idMap[id] ?? id}")`;
        });
    }
    // Link in markdown:
    if (isExport) { // On import, we want to preserve the keys in this case
        markdownOrLookup = markdownOrLookup.replaceAll(/\]\(\/entry\/([0-9\p{Alphabetic}_\-]+)\)/mgu, (_m, id) => {
            return `](/entry/${idMap[id] ?? id})`;
        });
    }
    return markdownOrLookup;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Main

if (import.meta.main) {
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
            const client = await getApiClient();
            log.warning("Deleting all entries");
            await client.eraseAllEntriesDangerously({ siteKey, confirm: "danger" });
            log.info("All entries deleted.");
            break;
        }
        default:
            dieUsage(0);
    }
}
