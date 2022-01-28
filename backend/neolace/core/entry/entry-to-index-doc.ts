import { VNID } from "neolace/deps/vertex-framework.ts";
import * as api from "neolace/deps/neolace-api.ts";

import { getGraph } from "neolace/core/graph.ts";
import { getEntry } from "neolace/api/site/{siteShortId}/entry/{entryId}/_helpers.ts";

/**
 * Generate a version of this entry that can be used to build the search index.
 */
export async function entryToIndexDocument(entryId: VNID, siteId: VNID): Promise<api.EntryIndexDocument> {
    // log.info(`Reindexing ${entryId} to ${collection}`);
    const graph = await getGraph();
    const entryData = await graph.read((tx) =>
        getEntry(
            entryId,
            siteId,
            tx,
            new Set([
                api.GetEntryFlags.IncludeFeatures,
                api.GetEntryFlags.IncludePropertiesSummary,
                api.GetEntryFlags.IncludeReferenceCache,
            ]),
        )
    );

    const description = entryData.description
        ? api.MDT.renderInlineToPlainText(api.MDT.tokenizeInlineMDT(entryData.description))
        : "";

    return {
        id: entryId,
        friendlyId: entryData.friendlyId,
        name: entryData.name,
        type: entryData.entryType.name,
        description,
        articleText: entryData.features?.Article?.articleMD ?? "",
        visibleToGroups: ["public"],
    };
}
