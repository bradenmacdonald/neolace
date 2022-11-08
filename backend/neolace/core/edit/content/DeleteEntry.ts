import { C } from "neolace/deps/vertex-framework.ts";
import { DeleteEntry, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doDeleteEntry = defineImplementation(DeleteEntry, async (tx, data, siteId) => {
    const entryMatch = C`
        MATCH (entry:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
    `;

    // Before we delete the entry, check if it has any relationships:
    const checkExtantRelationships = await tx.query(C`
        ${entryMatch}
        MATCH (entry)-[:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}]-(otherEntry:${Entry})
    `.RETURN({}));

    if (checkExtantRelationships.length > 0) {
        throw new InvalidEdit(
            DeleteEntry.code,
            { entryId: data.entryId },
            `For now, entries with relationships cannot be deleted. Remove the relationships, then delete the entry.`,
        );
        // We may remove this restriction in the future.
    }

    // Now delete it:
    await tx.queryOne(C`
        ${entryMatch}
        OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}|${Entry.rel.HAS_FEATURE_DATA}]->(data)
        DETACH DELETE data
        DETACH DELETE entry
    `.RETURN({}));
    return {
        modifiedNodes: [data.entryId],
        // TODO: In future, return the oldValues data required to re-create the entry?
    };
});
