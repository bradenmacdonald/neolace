import { C, VNID, WrappedTransaction, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";



type EntryPropertyValue = {
    label: string,
    valueExpression: string,
    importance: number,
    note: string,
}&(
    {
        type: "SimplePropertyValue",
        source: "EntryType",
        id: VNID,
    }
    |
    {
        type: "PropertyFact",
        property: {id: VNID},
        source: null,
    }
);


/**
 * Get all property values associated with an Entry, including SimplePropertyValues and (regular) property values
 * from PropertyFacts.
 *
 * This includes inherited properties and will order the results by importance.
 */
export async function getEntryProperties(entryId: VNID, options: {tx: WrappedTransaction, maxImportance?: number, skip?: number, limit?: number}): Promise<EntryPropertyValue[]> {

    // Neo4j doesn't allow normal query variables to be used for skip/limit so we have to carefully ensure these values
    // are safe (are just plain numbers) then format them for interpolation in the query string as part of the cypher
    // expression (not as variables)
    const skipSafe = C(String(Number(options.skip ?? 0)));
    const limitSafe = C(String(Number(Number(options.limit ?? 100))));

    const maxImportance = options.maxImportance ?? 100;  // Importance is in the range 0-99 so <= 100 will always match everything

    const data = await options.tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})

        WITH entry, entryType
        CALL {
            WITH entry, entryType
            // Fetch "Simple Property Values" attached to the entry type

            MATCH (entryType)-[:${EntryType.rel.HAS_SIMPLE_PROP}]->(spv:${SimplePropertyValue})
            WHERE spv.importance <= ${maxImportance}
            RETURN {
                label: spv.label,
                valueExpression: spv.valueExpression,
                importance: spv.importance,
                note: spv.note,

                type: "SimplePropertyValue",
                source: "EntryType",
                id: spv.id
            } AS propertyData

            UNION ALL

            // Fetch properties directly attached to the entry
            WITH entry
            MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(prop)
            WHERE prop.propertyImportance <= ${maxImportance}
            RETURN {
                label: prop.name,
                valueExpression: pf.valueExpression,
                importance: prop.propertyImportance,
                note: pf.note,

                type: "PropertyFact",
                property: {id: prop.id}
            } AS propertyData

            // Todo in future: also fetch inherited properties, properties attached to the entry type
        }
        RETURN propertyData
        ORDER BY propertyData.importance, propertyData.label
        SKIP ${skipSafe} LIMIT ${limitSafe}
    `.givesShape({
        propertyData: Field.Record({
            label: Field.String,
            valueExpression: Field.String,
            importance: Field.Int,
            note: Field.String,

            type: Field.String,
            source: Field.String,
            property: Field.NullOr.Record({id: Field.VNID}),
            id: Field.NullOr.VNID,
        }),
    }));

    // deno-lint-ignore no-explicit-any
    return data.map(d => d.propertyData as any);
}
