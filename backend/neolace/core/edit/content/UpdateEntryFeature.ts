import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpdateEntryFeature } from "neolace/deps/neolace-api.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";
import { features } from "neolace/core/entry/features/all-features.ts";

export const doUpdateEntryFeature = defineImplementation(UpdateEntryFeature, async (tx, data, siteId, draftId) => {
    // Load details of the feature that we're editing:
    const feature = features.find((f) => f.featureType === data.feature.featureType);
    if (feature === undefined) {
        throw new InvalidEdit(
            UpdateEntryFeature.code,
            { featureType: data.feature.featureType },
            `Unknown feature type ${data.feature.featureType}`,
        );
    }

    // Validate that the entry exists, is part of the correct site, and that its type has this feature enabled:
    try {
        await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
        `.RETURN({})); // If this returns a single result, we're good; otherwise it will throw an error.
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                UpdateEntryFeature.code,
                { featureType: data.feature.featureType, entryId: data.entryId },
                "Cannot set feature data for that entry - either the feature is not enabled or the entry ID is invalid.",
            );
        }
        throw err;
    }

    // Edit the feature:
    const { modifiedNodes, oldValues } = await feature.editFeature(
        data.entryId,
        // deno-lint-ignore no-explicit-any
        data.feature as any,
        tx,
        draftId,
    );
    if (modifiedNodes.length === 0) {
        return EditHadNoEffect;
    } else {
        modifiedNodes.push(data.entryId);
        return { modifiedNodes, oldValues };
    }
});
