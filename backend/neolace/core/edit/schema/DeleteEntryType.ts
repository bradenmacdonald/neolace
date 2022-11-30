import { C, Field } from "neolace/deps/vertex-framework.ts";
import { DeleteEntryType, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType } from "neolace/core/mod.ts";

export const doDeleteEntryType = defineImplementation(DeleteEntryType, async (tx, data, siteId) => {
    const baseQuery = C`
        MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: ${data.entryTypeKey}})
    `;
    // First make sure no entries exist:
    const checkEntries = await tx.query(C`
        ${baseQuery}
        MATCH (e:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et)
    `.RETURN({}));
    if (checkEntries.length > 0) {
        throw new InvalidEdit(
            DeleteEntryType.code,
            { entryTypeKey: data.entryTypeKey },
            `Entry types cannot be deleted while there are still entries of that type.`,
        );
    }

    const { etId } = await tx.queryOne(C`
        ${baseQuery}
        WITH et, et.id AS etId
        DETACH DELETE (et)
    `.RETURN({ etId: Field.VNID }));

    return {
        modifiedNodes: [etId],
    };
});
