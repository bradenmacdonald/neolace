/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field } from "neolace/deps/vertex-framework.ts";
import { UpdateProperty } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType, Property } from "neolace/core/mod.ts";

export const doUpdateProperty = defineImplementation(UpdateProperty, async (tx, data, siteId) => {
    // update the "appliesTo" of this property:
    if (data.appliesTo !== undefined) {
        const newAppliesToKeys = data.appliesTo.map((at) => at.entryTypeKey);
        // Create new "applies to" links:
        await tx.query(C`
            MATCH (p:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
            UNWIND ${newAppliesToKeys} as entryTypeKey
            MATCH (et:${EntryType} {siteNamespace: ${siteId}, key: entryTypeKey})
            MERGE (p)-[:${Property.rel.APPLIES_TO_TYPE}]->(et)
        `.RETURN({}));
        // Delete old "applies to" links:
        await tx.query(C`
            MATCH (p:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
            MATCH (p)-[rel:${Property.rel.APPLIES_TO_TYPE}]->(et:${EntryType})
            WHERE NOT et.key IN ${newAppliesToKeys}
            DELETE rel
        `.RETURN({}));
    }
    // update the "isA" of this property:
    if (data.isA !== undefined) {
        const newParentKeys = data.isA;
        // Create new "is a" / parent property links:
        await tx.query(C`
            MATCH (p:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
            UNWIND ${newParentKeys} as parentKey
            MATCH (pp:${Property} {siteNamespace: ${siteId}, key: parentKey})
            MERGE (p)-[:${Property.rel.HAS_PARENT_PROP}]->(pp)
        `.RETURN({}));
        // Delete old "is a" / parent property links:
        await tx.query(C`
            MATCH (p:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
            MATCH (p)-[rel:${Property.rel.HAS_PARENT_PROP}]->(pp)
            WHERE NOT pp.key IN ${newParentKeys}
            DELETE rel
        `.RETURN({}));
    }

    // Other fields:
    const changes: Record<string, unknown> = {};
    for (
        const field of [
            "name",
            "description",
            "mode",
            "valueConstraint",
            "default",
            "inheritable",
            "standardURL",
            "rank",
            "displayAs",
            "editNote",
            "enableSlots",
        ] as const
    ) {
        if (data[field] !== undefined) {
            changes[field] = data[field];
        }
    }
    // The following will also throw an exception if the property is not part of the current site, so
    // we always run this query even if changes is empty.
    const result = await tx.queryOne(C`
        MATCH (p:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
        SET p += ${changes}
    `.RETURN({ "p.id": Field.VNID }));

    return {
        modifiedNodes: [result["p.id"]],
    };
});
