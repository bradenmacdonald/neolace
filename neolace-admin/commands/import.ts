import { getApiClientFromEnv, log, parseYaml, SDK, VNID } from "../deps.ts";
import { contentTypeFromExtension } from "../lib/content-types.ts";
import { replaceIdsInMarkdownAndLookupExpressions } from "../lib/replace-ids.ts";
import { syncSchema } from "./sync-schema.ts";

/**
 * Import schema and content from a folder
 */
export async function importSchemaAndContent({ siteKey, sourceFolder }: { siteKey: string; sourceFolder: string }) {
    const client = await getApiClientFromEnv();
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
    const _pushEdits = async (edits: SDK.AnyContentEdit[], force = false) => {
        if (edits.length > 20 || (force && edits.length > 0)) {
            const { num: draftNum } = await client.createDraft({
                title: `Import Part ${part++}`,
                description: "",
                edits,
            }, {
                siteKey,
            });
            await client.acceptDraft(draftNum, { siteKey });
            edits.length = 0;
        }
    };
    const pushEdits = (edits: SDK.AnyContentEdit[]): Promise<void> => _pushEdits(edits, true);
    const pushEditsIfNeeded = (edits: SDK.AnyContentEdit[]): Promise<void> => _pushEdits(edits);

    // Next, create each entry with the minimal metadata (no properties)
    {
        log.info("Creating blank entries...");
        const edits: SDK.AnyContentEdit[] = [];
        let numEntries = 0;
        for await (const { metadata, key, entryType } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            edits.push({
                code: SDK.CreateEntry.code,
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
        const edits: SDK.AnyContentEdit[] = [];
        let numEntries = 0;
        let numProperties = 0;
        for await (const { metadata, key } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            // Get the key (human-readable ID) for each property actually used for this entry:
            const propertiesMap = metadata.properties ?? metadata;
            const propsUsed = Object.keys(propertiesMap).filter((k) => k in schema.properties);
            for (const propertyKey of propsUsed) {
                // Now we need to be able to handle either a list of property facts or a single string value:
                const facts = typeof propertiesMap[propertyKey] === "string"
                    ? [{ valueExpression: propertiesMap[propertyKey] }]
                    : propertiesMap[propertyKey];
                for (const fact of facts) {
                    if (fact.valueExpression === undefined) {
                        throw new Error(`Invalid property value on entry ${entryId} (${key})`);
                    }
                    edits.push({
                        code: SDK.AddPropertyFact.code,
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
                if (err instanceof SDK.InvalidEdit) {
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
        const edits: SDK.AnyContentEdit[] = [];
        let numArticles = 0;
        for await (const { metadata, key, articleContent } of iterateEntries()) {
            if (!articleContent) {
                continue;
            }
            const entryId = metadata.id ?? idMap[key];
            edits.push({
                code: SDK.UpdateEntryFeature.code,
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

        let draftNum: number | undefined;
        const getDraftNum = async (): Promise<number> =>
            draftNum ?? await client.createDraft(
                { title: `Import Part ${part++}`, description: "", edits: [] },
                { siteKey },
            ).then((d) => draftNum = d.num);

        let numFiles = 0;
        for await (const { metadata, key, folder } of iterateEntries()) {
            const entryId = metadata.id ?? idMap[key];
            if (metadata.image) {
                const fileContents = await Deno.readFile(folder + "/" + metadata.image);
                const extension = metadata.image.split(".").pop();
                const fileBlob = new Blob([fileContents], { type: contentTypeFromExtension(extension) });
                const tempFile = await client.uploadFile(fileBlob, { siteKey });
                await client.addEditToDraft({
                    code: SDK.UpdateEntryFeature.code,
                    data: {
                        entryId,
                        feature: {
                            featureType: "Image",
                            tempFileId: tempFile.tempFileId,
                            ...(metadata.imageSizing ? { setSizing: metadata.imageSizing } : {}),
                        },
                    },
                }, { draftNum: await getDraftNum(), siteKey });
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
                    const tempFile = await client.uploadFile(fileBlob, { siteKey });
                    await client.addEditToDraft({
                        code: SDK.UpdateEntryFeature.code,
                        data: {
                            entryId,
                            feature: {
                                featureType: "Files",
                                changeType: "addFile",
                                filename,
                                tempFileId: tempFile.tempFileId,
                            },
                        },
                    }, { draftNum: await getDraftNum(), siteKey });
                    numFiles++;
                }
            }
        }
        if (draftNum !== undefined) {
            await client.acceptDraft(draftNum, { siteKey });
            log.info(`${numFiles} files updated`);
        } else {
            log.info(`No files to update.`);
        }
    }
}
