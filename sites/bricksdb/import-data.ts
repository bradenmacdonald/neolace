#!/usr/bin/env deno run --allow-net --allow-read --allow-write --allow-env
/**
 * @author MacDonald Thoughtstuff Inc.
 * @license Unlicense (see https://unlicense.org/ - public domain, use as you will, but no warranty of any kind)
 */
import * as path from "std/path/mod.ts";
import * as log from "std/log/mod.ts";
import * as CSV from "std/encoding/csv.ts";

import * as SDK from "../../neolace-sdk/src/index.ts";
import { getApiClientFromEnv } from "../../neolace-sdk/utils/cli-client.ts";
import { importCsvFile } from "../../neolace-sdk/utils/csv-import.ts";

const siteKey = "bricksdb";
/** Shared options for the pushBulkEdits() API method. */
const bulkParams = { siteKey, connectionId: "bricksdb", createConnection: true };

const dataDir = path.dirname(path.fromFileUrl(import.meta.url)) + `/data`;

const dataFileNames = [
    "themes",
    "colors",
    "part_categories",
    "parts",
    "part_relationships",
    "elements",
    "sets",
    "minifigs",
    "inventories",
    "inventory_parts",
    "inventory_sets",
    "inventory_minifigs",
];

/** Check if all of the required CSV files exists locally and are resonably up to date. */
export async function areCsvDataFilesUpToDate(): Promise<boolean> {
    // Check the mtime of one of the files:
    let status: Deno.FileInfo;
    try {
        status = await Deno.stat(`${dataDir}/colors.csv`);
    } catch {
        return false; // If this file doesn't exist, the files are definitely not up to date.
    }
    // How many days old is colors.csv?
    const diffDays = (+new Date() - +(status.mtime ?? 0)) / 86400_000;
    if (diffDays > 30) {
        // Update the data files every month
        return false;
    }

    for (const name of dataFileNames) {
        try {
            await Deno.stat(`${dataDir}/${name}.csv`);
        } catch {
            // A required file is missing.
            return false;
        }
    }
    return true;
}

/**
 * Download the latest CSV files from Rebrickable
 * See https://rebrickable.com/downloads/ for details.
 *
 * This always overwrites the local files if they already exist.
 */
export async function updateCsvDownloads() {
    for (const name of dataFileNames) {
        log.info(`Downloading latest version of ${name}.csv`);
        const fullUrl = `https://cdn.rebrickable.com/media/downloads/${name}.csv.gz`;
        const dataResponse = await fetch(fullUrl);
        const outFile = `${dataDir}/${name}.csv`;

        const fileHandle = await Deno.open(outFile, { write: true, truncate: true, create: true });
        await dataResponse.body?.pipeThrough(new DecompressionStream("gzip")).pipeTo(fileHandle.writable);
    }
}

async function readCsv(filename: string) {
    const file = await Deno.readTextFile(`${dataDir}/${filename}.csv`);
    return CSV.parse(file, { skipFirstRow: true });
}

async function importThemes() {
    log.info("Importing themes");
    const client = await getApiClientFromEnv();
    await importCsvFile<["id", "name", "parent_id"]>(
        `${dataDir}/themes.csv`,
        (row, x) => {
            const entryKey = `theme-${row.id}`;
            x.upsert(entryKey, { entryTypeKey: "theme", name: row.name });
            x.setRelationshipProp(
                entryKey,
                "parent-theme",
                row.parent_id ? { entryKey: `theme-${row.parent_id}` } : [],
            );
        },
        client,
        bulkParams,
    );
}

/**
 * The Rebrickable database has many related themes - for example there are four themes called "Star Wars", where one
 * has no parent and the others are e.g. children of "Advent" or "Technic". These are clearly related themes but no
 * relationships exist in the dataset, so we should create them now.
 */
async function groupThemes() {
    const client = await getApiClientFromEnv();
    console.log("Detecting related themes");
    const allThemes = await readCsv("themes") as { id: string; name: string; parent_id: string }[];
    // Map of theme names to IDs of all themes with the same name
    const data: Record<string, string[]> = {};
    for (const row of allThemes) {
        if (row.name in data) {
            data[row.name].push(row.id);
        } else {
            data[row.name] = [row.id];
        }
    }
    for (const key of Object.keys(data)) {
        if (data[key].length < 2) {
            delete data[key];
        }
    }
    const edits: SDK.AnyBulkEdit[] = [];
    for (const [groupName, themeIds] of Object.entries(data)) {
        // We'll use the ID of the lowest-numbered (first) theme as the group ID too:
        const entryKey = `group-${themeIds[0]}`;
        edits.push({
            code: "UpsertEntryByKey",
            data: {
                where: { entryTypeKey: "theme-group", entryKey },
                set: { name: groupName },
            },
        });
        for (const themeId of themeIds) {
            edits.push({
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: `theme-${themeId}` },
                    set: [{
                        propertyKey: "theme-group",
                        toEntries: [{ entryWith: { entryKey } }],
                    }],
                },
            });
        }
    }
    console.log(` -> Submitting ${edits.length} edits`);
    await client.pushBulkEdits(edits, bulkParams);
}

function setNumToKey(set_num: string) {
    return `set-${set_num.replaceAll(".", "-")}`;
}

async function importSets() {
    log.info("Importing sets");
    const client = await getApiClientFromEnv();
    await importCsvFile<["set_num", "name", "year", "theme_id", "num_parts", "img_url"]>(
        `${dataDir}/sets.csv`,
        (row, x) => {
            const entryKey = setNumToKey(row.set_num);
            x.upsert(entryKey, { entryTypeKey: "set", name: row.name });
            x.setPropValues(entryKey, {
                "set-num": `"${row.set_num}"`,
                "year": `date("${row.year}")`,
                "image-url": `"${row.img_url}"`,
            });
            x.setRelationshipProp(entryKey, "theme", row.theme_id ? { entryKey: `theme-${row.theme_id}` } : []);
        },
        client,
        bulkParams,
    );
}

async function importColors() {
    log.info("Importing colors");
    const client = await getApiClientFromEnv();
    await importCsvFile<["id", "name", "rgb", "is_trans"]>(
        `${dataDir}/colors.csv`,
        (row, x) => {
            const entryKey = `color-${row.id}`;
            x.upsert(entryKey, { entryTypeKey: "color", name: row.name });
            x.setPropValues(entryKey, {
                "rgb": `"${row.rgb}"`,
                "is-transparent": row.is_trans === "t" ? "true" : "false",
            });
        },
        client,
        bulkParams,
    );
}

async function importPartCategories() {
    log.info("Importing part categories");
    const client = await getApiClientFromEnv();
    await importCsvFile<["id", "name"]>(
        `${dataDir}/part_categories.csv`,
        (row, x) => {
            const entryKey = `pc-${row.id}`;
            x.upsert(entryKey, { entryTypeKey: "part-category", name: row.name });
        },
        client,
        bulkParams,
    );
}

async function importParts() {
    log.info("Importing parts");
    const client = await getApiClientFromEnv();
    await importCsvFile<["part_num", "name", "part_cat_id", "part_material"]>(
        `${dataDir}/parts.csv`,
        (row, x) => {
            const entryKey = `part-${row.part_num.replaceAll(".", "-")}`;
            x.upsert(entryKey, { entryTypeKey: "part", name: row.name });
            x.setPropValues(entryKey, {
                "part-num": `"${row.part_num}"`,
                "material": `"${row.part_material}"`,
            });
            x.setRelationshipProp(entryKey, "part-category", { entryKey: `pc-${row.part_cat_id}` });
        },
        client,
        bulkParams,
    );
}

async function importPartRelationships() {
    log.info("Importing parts");
    const client = await getApiClientFromEnv();
    await importCsvFile<["rel_type", "child_part_num", "parent_part_num"]>(
        `${dataDir}/part_relationships.csv`,
        (row, x) => {
            const childPartKey = `part-${row.child_part_num.replaceAll(".", "-")}`;
            const parentPartKey = `part-${row.parent_part_num.replaceAll(".", "-")}`;
            // Note: we currently import all of these as directed relationships but some of them would probably be
            // better as peer group relationships, like we do for "related themes" with theme entries, because
            // relationships like "is variant" is more like a set of peer variants than a directed relationship.
            if (row.rel_type === "P") {
                // child "is a print of" parent:
                x.setRelationshipProp(childPartKey, "is-print-of", { entryKey: parentPartKey });
            } else if (row.rel_type === "R") {
                // child "pairs with" parent:
                x.setRelationshipProp(childPartKey, "pairs-with", { entryKey: parentPartKey });
            } else if (row.rel_type === "B") {
                // child "is suB-part of" parent:
                x.setRelationshipProp(childPartKey, "sub-part-of", { entryKey: parentPartKey });
            } else if (row.rel_type === "M") {
                // child "is mold variant of" parent:
                x.setRelationshipProp(childPartKey, "mold-var-of", { entryKey: parentPartKey });
            } else if (row.rel_type === "T") {
                // child "is pattern of" parent:
                x.setRelationshipProp(childPartKey, "pattern-of", { entryKey: parentPartKey });
            } else if (row.rel_type === "A") {
                // child "is alternate of" parent:
                x.setRelationshipProp(childPartKey, "alternate-of", { entryKey: parentPartKey });
            } else {
                log.warning(`Ignoring unknown part relationship type "${row.rel_type}"`);
            }
        },
        client,
        bulkParams,
    );
}

async function importMinifigs() {
    log.info("Importing minifigs");
    const client = await getApiClientFromEnv();
    await importCsvFile<["fig_num", "name", "num_parts", "img_url"]>(
        `${dataDir}/minifigs.csv`,
        (row, x) => {
            const entryKey = row.fig_num;
            x.upsert(entryKey, { entryTypeKey: "minifig", name: row.name });
            x.setPropValues(entryKey, {
                // We don't set "num_parts" for now - would be nice to compute it automatically but I don't think that
                // minifig parts data is included in the dataset at this time. It is on rebrickable.com though.
                "image-url": `"${row.img_url}"`,
            });
        },
        client,
        bulkParams,
    );
}

async function importInventories() {
    log.info("Importing inventories");
    const client = await getApiClientFromEnv();
    await importCsvFile<["id", "version", "set_num"]>(
        `${dataDir}/inventories.csv`,
        (row, x) => {
            const entryKey = `inv-${row.id}`;
            x.upsert(entryKey, { entryTypeKey: "inventory", name: `Version ${row.version}` });
            x.setPropValues(entryKey, { "version": `${row.version}` });
            x.setRelationshipProp(entryKey, "inv-set", { entryKey: setNumToKey(row.set_num) });
        },
        client,
        bulkParams,
    );
}

async function importElements() {
    log.info("Importing elements");
    const client = await getApiClientFromEnv();
    const allElements = await readCsv("elements") as { element_id: string; part_num: string; color_id: string }[];
    const partNames: Record<string, string> = {};
    for (const row of await readCsv("parts") as { part_num: string; name: string /* part_cat_id, part_material*/ }[]) {
        partNames[row.part_num] = row.name;
    }
    const colorNames: Record<string, string> = {};
    for (const row of await readCsv("colors") as { id: string; name: string }[]) {
        colorNames[row.id] = row.name;
    }

    const elementKeysProcessed = new Set<string>();

    await importCsvFile<["inventory_id", "part_num", "color_id", "quantity", "is_spare", "img_url"]>(
        `${dataDir}/inventory_parts.csv`,
        (row, x) => {
            // Our Neolace BricksDB key for this combination of part & color
            const elementKey = `el-${row.part_num.replaceAll(".", "-")}-${row.color_id}`;
            if (elementKeysProcessed.has(elementKey)) {
                return; // We already imported this element.
            } else {
                elementKeysProcessed.add(elementKey);
            }
            // Official lego Element IDs known for this combination of part & color, if any.
            const elementIds = allElements.filter((e) => e.part_num === row.part_num && e.color_id === row.color_id)
                .map((e) => e.element_id);
            x.upsert(elementKey, {
                entryTypeKey: "element",
                name: `${partNames[row.part_num]} - ${colorNames[row.color_id]}`,
                skipUpdate: true,
            });
            x.setPropValues(elementKey, {
                "image-url": `"${row.img_url}"`,
                "element-ids": elementIds.map((eid) => ({ valueExpression: `"${eid}"` })),
            });
            // Set the part and color for this element is:
            x.setRelationshipProp(elementKey, "is-part", { entryKey: `part-${row.part_num.replaceAll(".", "-")}` });
            x.setRelationshipProp(elementKey, "is-color", { entryKey: `color-${row.color_id}` });
        },
        client,
        bulkParams,
    );
}

async function importInventoryElements() {
    log.info("Linking inventories to elements");
    const client = await getApiClientFromEnv();

    const invParts: Record<string, [elementKey: string, quantity: number, is_spare: boolean][]> = {};

    for (
        const row of await readCsv("inventory_parts") as {
            inventory_id: string;
            part_num: string;
            color_id: string;
            quantity: string;
            is_spare: string;
        }[]
    ) {
        const inventoryKey = `inv-${row.inventory_id}`;
        // Our Neolace BricksDB key for this combination of part & color
        const elementKey = `el-${row.part_num.replaceAll(".", "-")}-${row.color_id}`;
        if (invParts[inventoryKey] === undefined) {
            invParts[inventoryKey] = [];
        }
        invParts[inventoryKey].push([elementKey, parseInt(row.quantity, 10), row.is_spare === "t"]);
    }

    const inventoriesCount = Object.keys(invParts).length;
    let i = 0;
    for (const [inventoryKey, elements] of Object.entries(invParts)) {
        if (i++ % 100 === 0) {
            // Print a progress message once in a while so users can see how far along we are:
            log.info(`Updating inventory elements - inventory ${i} of ${inventoriesCount}`);
        }
        try {
            await client.pushBulkEdits([{
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: inventoryKey },
                    set: [
                        {
                            propertyKey: "has-element",
                            toEntries: elements.map(([elementKey, quantity, isSpare]) => ({
                                entryWith: { entryKey: elementKey },
                                // TODO: quantity should be set as a proper sub-property once we support sub-props
                                note: `(${quantity})` + (isSpare ? " (spare)" : ""),
                            })),
                        },
                    ],
                },
            }], bulkParams);
        } catch (err) {
            if (
                err instanceof SDK.InvalidFieldValue &&
                err.message.includes(
                    "The specified bulk edits require too much memory to execute in a single transaction.",
                )
            ) {
                log.warning(`Inventory ${inventoryKey} has too many parts - skipping for now.`);
                // TODO: we can fix this with a new bulk edit type, UpsertPropertyValue, that creates or updates a
                // single property value or relationship, without making any changes to all the other propertyfacts set
                // for the same property on the same entry.
                // We could also open a draft, use the normal "add property fact" edit, accept the draft, and repeat
                // until all the parts are added, but it's better not to use drafts for imports/connectors.
            } else {
                log.error(`Unable to assign elements to inventory ${inventoryKey}`);
                throw err;
            }
        }
    }
}

async function importInventoryMinifigs() {
    log.info("Importing inventory minifigs");
    const client = await getApiClientFromEnv();

    const invMinifigs: Record<string, [minifigKey: string, quantity: number][]> = {};
    for (
        const row of await readCsv("inventory_minifigs") as {
            inventory_id: string;
            fig_num: string;
            quantity: string;
        }[]
    ) {
        const inventoryKey = `inv-${row.inventory_id}`;
        if (invMinifigs[inventoryKey] === undefined) {
            invMinifigs[inventoryKey] = [];
        }
        invMinifigs[inventoryKey].push([row.fig_num, parseInt(row.quantity, 10)]);
    }

    const inventoriesCount = Object.keys(invMinifigs).length;
    let i = 0;
    for (const [inventoryKey, minifigs] of Object.entries(invMinifigs)) {
        if (i++ % 100 === 0) {
            // Print a progress message once in a while so users can see how far along we are:
            log.info(`Updating inventory minifigs - inventory ${i} of ${inventoriesCount}`);
        }
        try {
            await client.pushBulkEdits([{
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: inventoryKey },
                    set: [
                        {
                            propertyKey: "has-minifig",
                            toEntries: minifigs.map(([minifigKey, quantity]) => ({
                                entryWith: { entryKey: minifigKey },
                                // TODO: quantity should be set as a proper sub-property once we support sub-props
                                note: quantity === 1 ? "" : `(${quantity})`,
                            })),
                        },
                    ],
                },
            }], bulkParams);
        } catch (err) {
            log.error(`Unable to assign minifigs to inventory ${inventoryKey}`);
            throw err;
        }
    }
}

async function importInventorySets() {
    log.info("Importing inventory sets");
    const client = await getApiClientFromEnv();

    const invMinifigs: Record<string, [setKey: string, quantity: number][]> = {};
    for (
        const row of await readCsv("inventory_sets") as {
            inventory_id: string;
            set_num: string;
            quantity: string;
        }[]
    ) {
        const inventoryKey = `inv-${row.inventory_id}`;
        const setKey = setNumToKey(row.set_num);
        if (invMinifigs[inventoryKey] === undefined) {
            invMinifigs[inventoryKey] = [];
        }
        invMinifigs[inventoryKey].push([setKey, parseInt(row.quantity, 10)]);
    }

    const inventoriesCount = Object.keys(invMinifigs).length;
    let i = 0;
    for (const [inventoryKey, sets] of Object.entries(invMinifigs)) {
        if (i++ % 100 === 0) {
            // Print a progress message once in a while so users can see how far along we are:
            log.info(`Updating inventory sets - inventory ${i} of ${inventoriesCount}`);
        }
        try {
            await client.pushBulkEdits([{
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: inventoryKey },
                    set: [
                        {
                            propertyKey: "has-set",
                            toEntries: sets.map(([setKey, quantity]) => ({
                                entryWith: { entryKey: setKey },
                                // TODO: quantity should be set as a proper sub-property once we support sub-props
                                note: quantity === 1 ? "" : `(${quantity})`,
                            })),
                        },
                    ],
                },
            }], bulkParams);
        } catch (err) {
            log.error(`Unable to assign sets to inventory ${inventoryKey}`);
            throw err;
        }
    }
}

if (import.meta.main) {
    // Configure logging:
    await log.setup({
        handlers: {
            console: new log.handlers.ConsoleHandler("DEBUG"),
        },
        loggers: {
            "neolace-sdk": { level: "DEBUG", handlers: ["console"] },
        },
    });

    // Do import
    const upToDate = await areCsvDataFilesUpToDate();
    if (!upToDate) {
        log.info("CSV files are not present or should be updated.");
        await updateCsvDownloads();
    }
    await importThemes();
    await groupThemes();
    await importSets();
    await importColors();
    await importPartCategories();
    await importParts();
    await importPartRelationships();
    await importMinifigs();
    await importInventories();
    await importElements();
    await importInventoryElements();
    await importInventoryMinifigs();
    await importInventorySets();
}
