import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpdateEntryType } from "neolace/deps/neolace-api.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { EntryType, Site } from "neolace/core/mod.ts";

export const doUpdateEntryType = defineImplementation(UpdateEntryType, async (tx, data, siteId) => {
    const changes: Record<string, unknown> = {};
    // Be sure we only set allowed properties onto the EntryType VNode:
    if (data.name !== undefined) changes.name = data.name;
    if (data.description !== undefined) changes.description = data.description;
    if (data.friendlyIdPrefix !== undefined) changes.friendlyIdPrefix = data.friendlyIdPrefix;
    if (data.color !== undefined) changes.color = data.color;
    if (data.colorCustom !== undefined) changes.colorCustom = data.colorCustom;
    if (data.abbreviation !== undefined) changes.abbreviation = data.abbreviation;

    if (Object.keys(changes).length === 0) {
        return EditHadNoEffect;
    }

    // The following query will also validate that the entry type exists and is linked to the site.
    try {
        await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${data.id}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            SET et += ${changes}
        `.RETURN({}));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                UpdateEntryType.code,
                { entryTypeId: data.id },
                "Cannot update that entry type - entry type does not exist.",
            );
        }
        throw err;
    }

    return {
        modifiedNodes: [data.id],
    };
});
