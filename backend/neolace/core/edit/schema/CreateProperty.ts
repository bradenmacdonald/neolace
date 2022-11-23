import { C } from "neolace/deps/vertex-framework.ts";
import { CreateProperty, PropertyMode, PropertyType, VNID } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Property, Site } from "neolace/core/mod.ts";
import { doUpdateProperty } from "./UpdateProperty.ts";

export const doCreateProperty = defineImplementation(CreateProperty, async (tx, data, siteId) => {
    const newId = VNID();
    await tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        CREATE (p:${Property})
        MERGE (p)-[:${Property.rel.FOR_SITE}]->(site)
        SET p.siteNamespace = site.id
        SET p += ${{
        id: newId,
        key: data.key,
        name: "New Property",
        description: "",
        rank: 15,
        // Property type - note that this cannot be changed once the property is created.
        type: data.type ?? PropertyType.Value,
        mode: PropertyMode.Optional,
        inheritable: data.inheritable ?? false,
        standardURL: "",
        editNote: "",
        displayAs: "",
        default: "",
        valueConstraint: "",
        enableSlots: false,
    }}
    `.RETURN({}));

    // Fall through to the "UpdateProperty" implementation:
    await doUpdateProperty.impl(tx, data, siteId);

    return {
        modifiedNodes: [newId],
    };
});
