import { C } from "neolace/deps/vertex-framework.ts";
import { UpdateProperty } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType, Property, Site } from "neolace/core/mod.ts";

export const doUpdateProperty = defineImplementation(UpdateProperty, async (tx, data, siteId) => {
    // update the "appliesTo" of this property:
    if (data.appliesTo !== undefined) {
        const newAppliesToIds = data.appliesTo.map((at) => at.entryType);
        // Create new "applies to" links:
        await tx.query(C`
            MATCH (p:${Property} {id: ${data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            UNWIND ${newAppliesToIds} as entryTypeId
            MATCH (et:${EntryType} {id: entryTypeId})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (p)-[:${Property.rel.APPLIES_TO_TYPE}]->(et)
        `.RETURN({}));
        // Delete old "applies to" links:
        await tx.query(C`
            MATCH (p:${Property} {id: ${data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            MATCH (p)-[rel:${Property.rel.APPLIES_TO_TYPE}]->(et:${EntryType})
            WHERE NOT et.id IN ${newAppliesToIds}
            DELETE rel
        `.RETURN({}));
    }
    // update the "isA" of this property:
    if (data.isA !== undefined) {
        const newParentIds = data.isA;
        // Create new "is a" / parent property links:
        await tx.query(C`
            MATCH (p:${Property} {id: ${data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            UNWIND ${newParentIds} as parentId
            MATCH (pp:${Property} {id: parentId})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (p)-[:${Property.rel.HAS_PARENT_PROP}]->(pp)
        `.RETURN({}));
        // Delete old "is a" / parent property links:
        await tx.query(C`
            MATCH (p:${Property} {id: ${data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            MATCH (p)-[rel:${Property.rel.HAS_PARENT_PROP}]->(pp)
            WHERE NOT pp.id IN ${newParentIds}
            DELETE rel
        `.RETURN({}));
    }

    // Other fields:
    const changes: Record<string, unknown> = {};
    for (
        const field of [
            "name",
            "descriptionMD",
            "mode",
            "valueConstraint",
            "default",
            "inheritable",
            "standardURL",
            "rank",
            "displayAs",
            "editNoteMD",
            "enableSlots",
        ] as const
    ) {
        if (data[field] !== undefined) {
            changes[field] = data[field];
        }
    }
    // The following will also throw an exception if the property is not part of the current site, so
    // we always run this query even if changes is empty.
    await tx.queryOne(C`
        MATCH (p:${Property} {id: ${data.id}})-[:${Property.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
        SET p += ${changes}
    `.RETURN({}));

    return {
        modifiedNodes: [data.id],
    };
});
