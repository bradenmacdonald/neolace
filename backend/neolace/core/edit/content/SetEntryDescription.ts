import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryDescription } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryDescription = defineImplementation(SetEntryDescription, async (tx, data, siteId) => {
    try {
        await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            SET e.description = ${data.description}
        `.RETURN({}));
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
    return {
        modifiedNodes: [data.entryId],
    };
});
