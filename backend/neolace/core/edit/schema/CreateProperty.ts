import { C } from "neolace/deps/vertex-framework.ts";
import { CreateProperty, PropertyMode, PropertyType } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Property, Site } from "neolace/core/mod.ts";
import { doUpdateProperty } from "./UpdateProperty.ts";

export const doCreateProperty = defineImplementation(CreateProperty, async (tx, data, siteId) => {
    await tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        CREATE (p:${Property} {id: ${data.id}})
        MERGE (p)-[:${Property.rel.FOR_SITE}]->(site)
        SET p += ${{
        name: "New Property",
        descriptionMD: "",
        rank: 15,
        // Property type - note that this cannot be changed once the property is created.
        type: data.type ?? PropertyType.Value,
        mode: PropertyMode.Optional,
        inheritable: data.inheritable ?? false,
        standardURL: "",
        editNoteMD: "",
        displayAs: "",
        default: "",
        valueConstraint: "",
        enableSlots: false,
    }}
    `.RETURN({}));

    // Fall through to the "UpdateProperty" implementation:
    await doUpdateProperty.impl(tx, data, siteId);

    return {
        modifiedNodes: [data.id],
    };
});
