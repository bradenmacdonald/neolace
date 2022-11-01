import { C } from "neolace/deps/vertex-framework.ts";
import { DeleteEntryType, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doDeleteEntryType = defineImplementation(DeleteEntryType, async (tx, data, siteId) => {
    const baseQuery = C`
        MATCH (site:${Site} {id: ${siteId}})
        MATCH (et:${EntryType} {id: ${data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
    `;
    // First make sure no entries exist:
    const checkEntries = await tx.query(C`
        ${baseQuery}
        MATCH (e:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et)
    `.RETURN({}));
    if (checkEntries.length > 0) {
        throw new InvalidEdit(
            DeleteEntryType.code,
            { entryTypeId: data.entryTypeId },
            `Entry types cannot be deleted while there are still entries of that type.`,
        );
    }

    await tx.queryOne(C`
        ${baseQuery}
        DETACH DELETE (et)
    `.RETURN({}));

    return {
        modifiedNodes: [data.entryTypeId],
    };
});
