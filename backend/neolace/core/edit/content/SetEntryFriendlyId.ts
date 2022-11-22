import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryFriendlyId } from "neolace/deps/neolace-api.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryFriendlyId = defineImplementation(SetEntryFriendlyId, async (tx, data, siteId) => {
    let result;
    try {
        result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            WITH e, e.friendlyId as oldFriendlyId, ${data.friendlyId} as newFriendlyId
            WITH e, oldFriendlyId, newFriendlyId, oldFriendlyId <> newFriendlyId AS isDifferent
            SET e += CASE WHEN isDifferent THEN {friendlyId: newFriendlyId} ELSE {} END
        `.RETURN({ "oldFriendlyId": Field.Slug, "isDifferent": Field.Boolean }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                SetEntryFriendlyId.code,
                { entryId: data.entryId },
                "Cannot set change the entry's friendly ID - entry does not exist.",
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
            friendlyId: result.oldFriendlyId,
        },
    };
});
