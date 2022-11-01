import { C, VNID } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpdateEntryTypeFeature } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType, Site } from "neolace/core/mod.ts";
import { features } from "neolace/core/entry/features/all-features.ts";

/**
 * Update a feature of a specific entry type. A feature is some type of content, like article text, image, or files.
 */
export const doUpdateEntryTypeFeature = defineImplementation(UpdateEntryTypeFeature, async (tx, data, siteId) => {
    const feature = features.find((f) => f.featureType === data.feature.featureType);
    if (feature === undefined) {
        throw new Error(`Unknown feature type ${data.feature.featureType}`);
    }
    const modifiedNodes: VNID[] = [data.entryTypeId];
    if (data.feature.enabled) {
        // First verify the entry type ID is from the correct site (a security issue):
        const matchedEntryType = await tx.query(C`
            MATCH (et:${EntryType} {id: ${data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
        `.RETURN({}));
        if (matchedEntryType.length !== 1) {
            throw new InvalidEdit(
                UpdateEntryTypeFeature.code,
                { entryTypeId: data.entryTypeId },
                "Cannot update a feature of that entry type - entry type does not exist.",
            );
        }

        // Now update it:
        await feature.updateConfiguration(
            data.entryTypeId,
            // deno-lint-ignore no-explicit-any
            data.feature.config as any,
            tx,
            (id) => modifiedNodes.push(id),
        );
    } else {
        await tx.query(C`
            MATCH (et:${EntryType} {id: ${data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
            DETACH DELETE feature
        `);
    }
    return { modifiedNodes };
});
