import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryKey } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryKey = defineImplementation(SetEntryKey, async (tx, data, siteId) => {
    let result;
    try {
        result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            WITH e, e.key as oldKey, ${data.key} as newKey
            WITH e, oldKey, newKey, oldKey <> newKey AS isDifferent
            SET e += CASE WHEN isDifferent THEN {key: newKey} ELSE {} END
        `.RETURN({ "oldKey": Field.Slug, "isDifferent": Field.Boolean }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                SetEntryKey.code,
                { entryId: data.entryId },
                "Cannot change the entry's key - entry does not exist.",
            );
        }
        throw err;
    }

    if (!result.isDifferent) {
        return EditHadNoEffect;
    }
    return {
        modifiedNodes: [data.entryId],
        oldValues: {
            key: result.oldKey,
        },
    };
});
