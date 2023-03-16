import { assertEquals, getApiClientFromEnv, log, SDK, stringifyYaml, VNID } from "../deps.ts";
import { extensionFromContentType } from "../lib/content-types.ts";
import { replaceIdsInMarkdownAndLookupExpressions } from "../lib/replace-ids.ts";
import { schemaToYaml, yamlToSchema } from "../lib/schema-yaml.ts";

async function exportSchema(siteKey: string): Promise<string> {
    const client = await getApiClientFromEnv();
    const schema = await client.getSiteSchema({ siteKey });
    const yamlSchema = schemaToYaml(schema);
    // Do a quick validation:
    try {
        assertEquals(yamlToSchema(yamlSchema), schema);
    } catch (err) {
        log.error(`Warning: detected that importing the exported schema would have some differences.`, err);
    }
    return yamlSchema;
}

/**
 * This function implements the export command, which can be invoked as
 *     neolace-admin.ts export-schema site_id
 *     neolace-admin.ts export site_id [folder_name]
 */
export async function exportCommand(
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
        const client = await getApiClientFromEnv();
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
                    flags: [SDK.GetEntryFlags.IncludeFeatures, SDK.GetEntryFlags.IncludeRawProperties] as const,
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

                const properties: Record<string, unknown> = {};

                for (const prop of entryData.propertiesRaw!) {
                    if (prop.facts.length === 1 && !prop.facts[0].note && !prop.facts[0].slot) {
                        properties[prop.propertyKey] = replaceIdsInMarkdownAndLookupExpressions(
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
                        properties[prop.propertyKey] = factsSimplified;
                    }
                }

                if (Object.keys(properties).length > 0) {
                    metadata.properties = properties;
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
