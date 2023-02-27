import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryName } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryName = defineImplementation(SetEntryName, async (tx, data, siteId) => {
    let result;
    try {
        result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            WITH e, e.name as oldName, ${data.name} as newName
            WITH e, oldName, newName, oldName <> newName AS isDifferent
            SET e += CASE WHEN isDifferent THEN {name: newName} ELSE {} END
        `.RETURN({ oldName: Field.String, "isDifferent": Field.Boolean }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                SetEntryName.code,
                { entryId: data.entryId },
                "Cannot set change the entry's name - entry does not exist.",
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
            name: result.oldName,
        },
    };
});
