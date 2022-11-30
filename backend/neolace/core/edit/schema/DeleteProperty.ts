import { C, Field } from "neolace/deps/vertex-framework.ts";
import { DeleteProperty, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Property, PropertyFact } from "neolace/core/mod.ts";

export const doDeleteProperty = defineImplementation(DeleteProperty, async (tx, data, siteId) => {
    // Before we delete the property, check if it has any matching values:
    const checkExtantValues = await tx.queryOne(C`
        MATCH (property:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
        MATCH (pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
    `.RETURN({ "count(pf)": Field.Int }));
    const factsCount = checkExtantValues["count(pf)"];
    if (factsCount > 0) {
        throw new InvalidEdit(
            DeleteProperty.code,
            { propertyKey: data.key },
            `Properties cannot be deleted while there are still entries with values set for that property.`,
        );
    }
    // Now delete it:
    const { propVnid } = await tx.queryOne(C`
        MATCH (property:${Property} {siteNamespace: ${siteId}, key: ${data.key}})
        WITH property, property.id AS propVnid
        DETACH DELETE property
    `.RETURN({ propVnid: Field.VNID }));

    return {
        modifiedNodes: [propVnid],
    };
});
