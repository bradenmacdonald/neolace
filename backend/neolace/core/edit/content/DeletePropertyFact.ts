import { C, Field } from "neolace/deps/vertex-framework.ts";
import { DeletePropertyFact, InvalidEdit } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, PropertyFact, Site } from "neolace/core/mod.ts";

export const doDeletePropertyFact = defineImplementation(DeletePropertyFact, async (tx, data, siteId) => {
    const propertyFactId = data.propertyFactId;
    const matchEntry =
        C`MATCH (entry:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})`;
    const result = await tx.query(C`
        ${matchEntry}
        MATCH (pf:${PropertyFact} {id: ${propertyFactId}})<-[:${Entry.rel.PROP_FACT}]-(entry)
        
        // If it's a relationship property, we also have to delete the direct relationship:
        OPTIONAL MATCH (e)-[rel]->(e2) WHERE pf.directRelNeo4jId = id(rel)
        WITH pf, rel, pf {.valueExpression, .slot, .note, .rank} AS pfData
        DETACH DELETE pf, rel
    `.RETURN({
        "pfData": Field.Record({
            valueExpression: Field.String,
            slot: Field.String,
            note: Field.String,
            rank: Field.Int,
        }),
    }));

    if (result.length === 1) {
        // Normal path - one property fact was deleted:
        const oldFact = result[0].pfData;
        return {
            // Changing a property value always counts as modifying the entry:
            modifiedNodes: [data.entryId, data.propertyFactId],
            oldValues: {
                fact: oldFact,
            },
        };
    } else if (result.length > 1) {
        throw new Error("DeletePropertyFact matched multiple rows?!?!");
    } else {
        // No fact was deleted. Is it because the entry doesn't exist, or the property fact doesn't exist on the entry?
        // We want these edit to be idempotent, so if the property was previously deleted, it's not an error.
        const entryCheck = await tx.query(matchEntry.RETURN({}));
        if (entryCheck.length === 1) {
            // The entry is valid.
            return EditHadNoEffect; // The propertyfact was already deleted or never existed. Our work is done.
        } else {
            // The entry is invalid:
            throw new InvalidEdit(
                DeletePropertyFact.code,
                { propertyFactId: propertyFactId, entryId: data.entryId },
                `Cannot delete property fact - entry does not exist.`,
            );
        }
    }
});
