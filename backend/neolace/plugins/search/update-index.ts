import * as log from "std/log/mod.ts";
import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { TypeSense } from "neolace/deps/typesense.ts";

import { Entry, EntryType, getEntry, GetEntryFlags, graph, Site } from "neolace/plugins/api.ts";

import { client } from "./typesense-client.ts";
import { getSiteCollectionAlias } from "./site-collection.ts";

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

/**
 * Generate a TypeSense document for a given entry, so we can upsert it into the search index.
 */
async function entryToDocument(entryId: VNID, siteId: VNID) {
    // log.info(`Reindexing ${entryId} to ${collection}`);
    const entryData = await graph.read((tx) =>
        getEntry(
            entryId,
            siteId,
            tx,
            new Set([GetEntryFlags.IncludeFeatures, GetEntryFlags.IncludePropertiesSummary]),
        )
    );
    return {
        id: entryId,
        name: entryData.name,
        type: entryData.entryType.name,
        description: entryData.description,
        articleText: entryData.features?.Article?.articleMD ?? "",
    };
}

export async function reindexAllEntries(siteId: VNID) {
    if (await currentReIndexJobForSite(siteId)) {
        throw new Error("A re-index job is already in progress");
    }
    // Create a new collection:
    const siteAliasCollection = await getSiteCollectionAlias(siteId);
    const newCollectionName = `${siteAliasCollection}_${Date.now()}`;
    client.collections().create({
        name: newCollectionName,
        fields: [
            { name: "id", type: "string", facet: false },
            { name: "name", type: "string", facet: false },
            { name: "type", type: "string", facet: true },
            { name: "description", type: "string", facet: false },
            { name: "articleText", type: "string", facet: false },
            // For properties, we store all values as strings or string arrays
            // https://typesense.org/docs/0.22.1/api/documents.html#indexing-all-values-as-string
            { "name": "prop_.*", "type": "string*" },
        ],
    });
    await setCurrentReIndexJobForSite(siteId, newCollectionName);

    try {
        // For each entry, reindex the entry
        await graph.read(async (tx) => {
            // Iterate over entries in chunks of 500
            const pageSize = 500;
            let offset = 0;
            while (true) {
                const entriesChunk = await tx.query(C`
                    MATCH (site:${Site} {id: ${siteId}})
                    MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)

                    RETURN entry.id SKIP ${C(offset.toFixed(0))} LIMIT ${C(pageSize.toFixed(0))}
                `.givesShape({ "entry.id": Field.VNID }));

                const documents = await Promise.all(
                    entriesChunk.map((row) => entryToDocument(row["entry.id"], siteId)),
                );
                try {
                    await client.collections(newCollectionName).documents().import(documents, { action: "upsert" });
                } catch (err) {
                    if (err instanceof TypeSense.Errors.ImportError) {
                        log.error(err.importResults);
                    }
                    throw err;
                }

                log.info(`Re-indexed ${entriesChunk.length} entries...`);
                if (entriesChunk.length < pageSize) {
                    break;
                } else {
                    offset += pageSize;
                }
            }
        });
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
    client.aliases().upsert(siteAliasCollection, { collection_name: newCollectionName });
    log.info(`Completed reindex for site ${siteId}, using new collection ${newCollectionName}`);
}
