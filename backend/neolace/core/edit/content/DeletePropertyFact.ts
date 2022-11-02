import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { DeletePropertyFact, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Property, PropertyFact, Site } from "neolace/core/mod.ts";

export const doDeletePropertyFact = defineImplementation(DeletePropertyFact, async (tx, data, siteId) => {
    const propertyFactId = data.propertyFactId;
    let modifiedEntry;
    try {
        modifiedEntry = await tx.queryOne(C`
            MATCH (pf:${PropertyFact} {id: ${propertyFactId}})-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
            MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(e:${Entry} {id: ${data.entryId}})
            MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            // If it's a relationship property, we also have to delete the direct relationship:
            OPTIONAL MATCH (e)-[rel]->(e2) WHERE pf.directRelNeo4jId = id(rel)
            DETACH DELETE pf, rel   
        `.RETURN({ "e.id": Field.VNID }));
    } catch (err: unknown) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                DeletePropertyFact.code,
                { propertyFactId: propertyFactId },
                `That property fact does not exist on that entry.`,
            );
        } else {
            throw err;
        }
    }

    return {
        // Changing a property value always counts as modifying the entry:
        modifiedNodes: [modifiedEntry["e.id"], data.propertyFactId],
    };
});
