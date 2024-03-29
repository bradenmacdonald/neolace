/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { log } from "neolace/app/log.ts";
import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { TypeSense } from "neolace/deps/typesense.ts";

import {
    api,
    Entry,
    entryToIndexDocument,
    EntryType,
    getGraph,
    makeCypherCondition,
    Site,
} from "neolace/plugins/api.ts";

import { getTypeSenseClient } from "./typesense-client.ts";
import { getSiteCollectionAlias } from "./site-collection.ts";
import { preloadDataForIndexingEntries } from "../../core/entry/entry-to-index-doc.ts";

// TODO: store this in Redis, with an expiring key
const _sitesBeingReindexed = new Map<VNID, string>(); // Map of site VNID to collection name

/**
 * If we are currently re-indexing all the entries for a site, this will return the name of the new TypeSense collection
 * that will hold the new entry documents, as we rebuild the index.
 */
// deno-lint-ignore require-await
export async function currentReIndexJobForSite(siteId: VNID): Promise<string | undefined> {
    // TODO: store this in Redis, with an expiring key
    return _sitesBeingReindexed.get(siteId);
}
// deno-lint-ignore require-await
export async function setCurrentReIndexJobForSite(siteId: VNID, collection: string, done = false): Promise<void> {
    // TODO: store this in Redis, with an expiring key
    if (done && _sitesBeingReindexed.get(siteId) === collection) {
        _sitesBeingReindexed.delete(siteId);
    } else {
        _sitesBeingReindexed.set(siteId, collection);
    }
}

/**
 * @param siteId
 */
async function _getCollectionToUpdate(siteId: VNID): Promise<string | undefined> {
    const client = await getTypeSenseClient();
    const newCollection = await currentReIndexJobForSite(siteId);
    if (newCollection) {
        // We're in the middle of a re-index operation. Just write to the new index and leave the old one alone.
        // We need to make sure the new one doesn't miss any edits, but we don't care about the old one any more.
        return newCollection;
    }

    const siteAliasName = await getSiteCollectionAlias(siteId);
    // We're not in the middle of a complete re-index, so just update the active collection
    try {
        const aliasData = await client.aliases(siteAliasName).retrieve();
        return aliasData.collection_name;
    } catch (err) {
        if (err instanceof TypeSense.Errors.ObjectNotFound) {
            // There is no active collection for this site's alias.
        }
    }
}

export async function reindexAllEntries(siteId: VNID) {
    const graph = await getGraph();
    const client = await getTypeSenseClient();
    if (await currentReIndexJobForSite(siteId)) {
        throw new Error("A re-index job is already in progress");
    }

    // This will filter to only index entries that the current user can see:
    const permissionsCondition = await makeCypherCondition({ siteId, userId: undefined }, api.CorePerm.viewEntry, {}, [
        "entry",
        "entryType",
    ]);

    const totalCount = await graph.read(async (tx) =>
        tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
        WHERE ${permissionsCondition}
    `.RETURN({ "count(entry)": Field.Int }))
    );

    if (totalCount["count(entry)"] > 10_000) {
        log.error("For now, cannot reindex sites with more than 10k entries.");
        return;
    }

    const startTime = performance.now();

    // Create a new collection:
    const siteAliasCollection = await getSiteCollectionAlias(siteId);
    const newCollectionName = `${siteAliasCollection}_${Date.now()}`;
    client.collections().create({
        name: newCollectionName,
        fields: [
            { name: "id", type: "string", facet: false },
            { name: "key", type: "string", facet: false },
            { name: "name", type: "string", facet: false },
            { name: "entryTypeKey", type: "string", facet: true },
            { name: "description", type: "string", facet: false },
            { name: "articleText", type: "string", facet: false },
            { name: "visibleToGroups", type: "string[]", facet: false },
            // For properties, we store all values as strings or string arrays
            // https://typesense.org/docs/0.22.1/api/documents.html#indexing-all-values-as-string
            { name: "prop_.*", type: "string[]" },
            { name: "allProps", type: "string[]" },
        ],
    });
    await setCurrentReIndexJobForSite(siteId, newCollectionName);

    try {
        // Iterate over entries in chunks of 25
        // For each entry, reindex the entry
        const pageSize = 100;
        let offset = 0;
        while (true) {
            const entriesChunk = await graph.read(async (tx) =>
                tx.query(C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                WHERE ${permissionsCondition}

                RETURN entry.id ORDER BY entry.id SKIP ${C(offset.toFixed(0))} LIMIT ${C(pageSize.toFixed(0))}
            `.givesShape({ "entry.id": Field.VNID }))
            );

            const entryIds = entriesChunk.map((row) => row["entry.id"]);

            const data = await preloadDataForIndexingEntries(entryIds);

            const documents: api.EntryIndexDocument[] = [];
            const parallelEntries = 5;
            for (let i = 0; i < Object.keys(data).length; i += parallelEntries) {
                documents.push(
                    ...await Promise.all(
                        Object.keys(data).slice(i, i + parallelEntries).map(
                            (entryId) => entryToIndexDocument(entryId as VNID, data[entryId as VNID]),
                        ),
                    ),
                );
            }

            if (documents.length > 0) { // <-- .import() will give an error if we pass in an empty list
                try {
                    await client.collections(newCollectionName).documents().import(documents, { action: "upsert" });
                } catch (err) {
                    if (err instanceof TypeSense.Errors.ImportError) {
                        log.error(err.importResults);
                    }
                    throw err;
                }
            }

            const elapsedTimeMs = performance.now() - startTime;
            const indexedCount = offset + entriesChunk.length;
            const remainingCount = totalCount["count(entry)"] - indexedCount;
            const estimatedTimeRemaining = indexedCount === 0 ? 0 : remainingCount * (elapsedTimeMs / indexedCount);
            log.info(
                `Re-indexed ${indexedCount} of ~${totalCount["count(entry)"]} entries ` +
                    `(${(elapsedTimeMs / 1000).toFixed(1)}s elapsed, ${
                        (estimatedTimeRemaining / 60_000).toFixed(0)
                    }m left)...`,
            );
            if (entriesChunk.length < pageSize) {
                break;
            } else {
                offset += pageSize;
            }
        }
    } catch (err) {
        log.error(`Reindex failed.`);
        try {
            await setCurrentReIndexJobForSite(siteId, newCollectionName, false);
            await client.collections(newCollectionName).delete();
        } catch {
            log.error(`Failed to delete incomplete reindex collection ${newCollectionName}`);
        }
        throw err;
    }
    // Reindex complete! Update the alias to point to the new collection.
    await client.aliases().upsert(siteAliasCollection, { collection_name: newCollectionName });
    log.info(`Completed reindex for site ${siteId}, using new collection ${newCollectionName}`);
}
