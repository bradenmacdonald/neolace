import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpdateEntryType } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { EntryType } from "neolace/core/mod.ts";

export const doUpdateEntryType = defineImplementation(UpdateEntryType, async (tx, data, siteId) => {
    const changes: Record<string, unknown> = {};
    // Be sure we only set allowed properties onto the EntryType VNode:
    if (data.name !== undefined) changes.name = data.name;
    if (data.description !== undefined) changes.description = data.description;
    if (data.keyPrefix !== undefined) changes.keyPrefix = data.keyPrefix;
    if (data.color !== undefined) changes.color = data.color;
    if (data.colorCustom !== undefined) changes.colorCustom = data.colorCustom;
    if (data.abbreviation !== undefined) changes.abbreviation = data.abbreviation;

    if (Object.keys(changes).length === 0) {
        return EditHadNoEffect;
    }

    // The following query will also validate that the entry type exists and is linked to the site.
    let result;
    try {
        result = await tx.queryOne(C`
            MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: ${data.key}})
            SET et += ${changes}
        `.RETURN({ "et.id": Field.VNID }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                UpdateEntryType.code,
                { entryTypeId: data.key },
                "Cannot update that entry type - entry type does not exist.",
            );
        }
        throw err;
    }

    return {
        modifiedNodes: [result["et.id"]],
    };
});
