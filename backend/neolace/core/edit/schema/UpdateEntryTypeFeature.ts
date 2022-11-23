import { C, EmptyResultError, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpdateEntryTypeFeature } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType } from "neolace/core/mod.ts";
import { features } from "neolace/core/entry/features/all-features.ts";

/**
 * Update a feature of a specific entry type. A feature is some type of content, like article text, image, or files.
 */
export const doUpdateEntryTypeFeature = defineImplementation(UpdateEntryTypeFeature, async (tx, data, siteId) => {
    const feature = features.find((f) => f.featureType === data.feature.featureType);
    if (feature === undefined) {
        throw new Error(`Unknown feature type ${data.feature.featureType}`);
    }
    const modifiedNodes: VNID[] = [];
    if (data.feature.enabled) {
        // First verify the entry type ID is from the correct site (a security issue):
        const matchedEntryType = await tx.queryOne(C`
            MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: ${data.entryTypeKey}})
        `.RETURN({ "et.id": Field.VNID })).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new InvalidEdit(
                    UpdateEntryTypeFeature.code,
                    { entryTypeKey: data.entryTypeKey },
                    "Cannot update a feature of that entry type - entry type does not exist.",
                );
            }
            throw err;
        });
        /** The internal VNID of the entry type */
        const entryTypeId = matchedEntryType["et.id"];
        modifiedNodes.push(entryTypeId);

        // Now update it:
        await feature.updateConfiguration(
            entryTypeId,
            // deno-lint-ignore no-explicit-any
            data.feature.config as any,
            tx,
            (id) => modifiedNodes.push(id),
        );
    } else {
        await tx.query(C`
            MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: ${data.entryTypeKey}})
            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
            DETACH DELETE feature
        `);
    }
    return { modifiedNodes };
});
