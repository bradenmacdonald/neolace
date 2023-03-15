/**
 * @file Edit operation to update a property fact
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, PropertyType, UpdatePropertyFact } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation, EditHadNoEffect } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Property, PropertyFact, Site } from "neolace/core/mod.ts";
import { directRelTypeForPropertyType, parseLookupExpressionToEntryId } from "neolace/core/entry/PropertyFact.ts";

export const doUpdatePropertyFact = defineImplementation(UpdatePropertyFact, async (tx, data, siteId) => {
    const propertyFactId = data.propertyFactId;
    const updatedFields: Record<string, unknown> = {};
    if (data.valueExpression !== undefined) {
        updatedFields.valueExpression = data.valueExpression;
    }
    if (data.note !== undefined) updatedFields.note = data.note;
    if (data.rank !== undefined) updatedFields.rank = BigInt(data.rank);
    if (data.slot !== undefined) updatedFields.slot = data.slot;

    if (Object.keys(updatedFields).length === 0) {
        return EditHadNoEffect; // No changes to apply, actually.
    }
    let baseData;
    try {
        baseData = await tx.queryOne(C`
            // Find the property fact and make sure it's associated with the correct Entry and Site:
            MATCH (pf:${PropertyFact} {id: ${propertyFactId}})-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
            MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(e:${Entry} {id: ${data.entryId}})
            MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            WITH pf, e.id AS entryId, e.valueExpression AS originalValue, property.type AS propertyType
            UNWIND ${Object.entries(updatedFields)} AS keyvalue
            // For each change to the property fact, record the old value and only apply the change if the new value
            // is actually different:
            WITH pf, originalValue, propertyType, keyvalue[0] AS key, keyvalue[1] AS value, pf[keyvalue[0]] as oldValue
            SET pf += CASE WHEN oldValue <> value THEN apoc.map.fromPairs([[key,value]]) ELSE {} END
            WITH originalValue, propertyType, collect({key: key, oldValue: oldValue, changed: oldValue <> value}) AS changes
        `.RETURN({
            originalValue: Field.String,
            propertyType: Field.String,
            changes: Field.List(Field.Record({ key: Field.String, oldValue: Field.Any, changed: Field.Boolean })),
        }));
    } catch (err) {
        if (err instanceof EmptyResultError) {
            throw new InvalidEdit(
                UpdatePropertyFact.code,
                { entryId: data.entryId, propertyFactId: propertyFactId },
                `That property fact does not exist on that entry.`,
            );
        }
        throw err;
    }

    if (baseData.changes.every((c) => !c.changed)) {
        // Nothing was changed.
        return EditHadNoEffect;
    }

    const propType = baseData.propertyType as PropertyType;
    const directRelType = directRelTypeForPropertyType(propType); // If this is a relationship property, there is a relationship of this type directly between two entries
    if (directRelType !== null && data.valueExpression && data.valueExpression !== baseData.originalValue) {
        // We have changed the value of a relationship property, so we have to ensure the target entry
        // exists and update the direct relationship between the entries:
        // There is a relationship FROM the current entry TO the entry with this id:
        const toEntryId = parseLookupExpressionToEntryId(data.valueExpression);

        // We also need to update a direct (Entry)-[rel]->(Entry) relationship on the graph.
        try {
            await tx.queryOne(C`
                // Get the property fact and the "from entry":
                MATCH (pf:${PropertyFact} {id: ${propertyFactId}})<-[:${Entry.rel.PROP_FACT}]-(entry:${Entry})
                // Match the target entry and make sure it's part of the same site:
                MATCH (toEntry:${Entry} {id: ${toEntryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                // Delete the existing relationship:
                MATCH (entry)-[oldRel]->(oldEntry:${Entry}) WHERE pf.directRelNeo4jId = id(oldRel)
                DELETE oldRel
                CREATE (entry)-[rel:${directRelType}]->(toEntry)
                SET pf.directRelNeo4jId = id(rel)
            `.RETURN({ "pf.directRelNeo4jId": Field.BigInt }));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new InvalidEdit(
                    UpdatePropertyFact.code,
                    {
                        propertyFactId: data.propertyFactId,
                        toEntryId: toEntryId,
                        fromEntryId: data.entryId,
                    },
                    `Target entry not found - cannot set that non-existent entry as an updated relationship property value.`,
                );
            } else {
                throw err; // Other unknown internal error.
            }
        }
    }

    return {
        // Changing a property value always counts as modifying the entry:
        modifiedNodes: [data.entryId, data.propertyFactId],
        oldValues: Object.fromEntries(baseData.changes.filter((c) => c.changed).map((c) => [c.key, c.oldValue])),
    };
});
