/**
 * @file Edit operation to delete an entry
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C } from "neolace/deps/vertex-framework.ts";
import { DeleteEntry, InvalidEdit } from "neolace/deps/neolace-sdk.ts";
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
