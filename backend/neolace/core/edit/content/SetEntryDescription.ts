import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryDescription } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryDescription = defineImplementation(SetEntryDescription, async (tx, data, siteId) => {
    let result;
    try {
        result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            WITH e, e.description as oldValue, ${data.description} as newValue
            WITH e, oldValue, newValue, oldValue <> newValue AS isDifferent
            SET e += CASE WHEN isDifferent THEN {description: newValue} ELSE {} END
        `.RETURN({ "oldValue": Field.Slug, "isDifferent": Field.Boolean }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                SetEntryDescription.code,
                { entryId: data.entryId },
                "Cannot set change the entry's description - entry does not exist.",
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
            description: result.oldValue,
        },
    };
});
