import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, SetEntryName } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doSetEntryName = defineImplementation(SetEntryName, async (tx, data, siteId) => {
    try {
        await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            SET e.name = ${data.name}
        `.RETURN({}));
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
    return {
        modifiedNodes: [data.entryId],
    };
});
