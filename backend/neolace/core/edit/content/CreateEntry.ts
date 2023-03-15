/**
 * @file Edit operation to create a new entry
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C } from "neolace/deps/vertex-framework.ts";
import { CreateEntry, InvalidEdit } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType } from "neolace/core/mod.ts";

export const doCreateEntry = defineImplementation(CreateEntry, async (tx, data, siteId) => {
    if (data.key.length > 55) {
        throw new InvalidEdit(
            CreateEntry.code,
            { entryId: data.entryId },
            `The key "${data.key}" is too long.`,
        );
    }
    await tx.queryOne(C`
        MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: ${data.entryTypeKey}})
        CREATE (e:${Entry} {id: ${data.entryId}})
        CREATE (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)
        SET e.siteNamespace = ${siteId}
        SET e += ${{
        key: data.key,
        name: data.name,
        description: data.description,
    }}
    `.RETURN({}));

    return {
        modifiedNodes: [data.entryId],
    };
});
