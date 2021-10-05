import { C, VNID, WrappedTransaction, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";
import { UseAsPropertyData } from "neolace/core/entry/features/UseAsProperty/UseAsPropertyData.ts";



type EntryPropertyValue = {
    label: string,
    valueExpression: string,
    importance: number,
    note: string,
    id: VNID,
}&(
    {
        type: "SimplePropertyValue",
        source: {from: "EntryType"},
    }
    |
    {
        type: "PropertyValue",
        source: {from: "ThisEntry"}|{from: "AncestorEntry", entryId: VNID},
        displayAs: null|string,
    }
);


/**
 * Get all property values associated with an Entry, including SimplePropertyValues and (regular) property values
 * from PropertyFacts.
 *
 * This includes inherited properties and will order the results by importance.
 */
export async function getEntryProperties<TC extends true|undefined = undefined>(entryId: VNID, options: {
    tx: WrappedTransaction,
    maxImportance?: number,
    skip?: number,
    limit?: number,
    /** Should the total count of matching properties be included in the results? */
    totalCount?: TC,
}): Promise<EntryPropertyValue[] & (TC extends true ? {totalCount: number} : unknown)> {

    // Neo4j doesn't allow normal query variables to be used for skip/limit so we have to carefully ensure these values
    // are safe (are just plain numbers) then format them for interpolation in the query string as part of the cypher
    // expression (not as variables)
    const skipSafe = C(String(Number(options.skip ?? 0)));
    const limitSafe = C(String(Number(Number(options.limit ?? 100))));

    const maxImportance = options.maxImportance ?? 100;  // Importance is in the range 0-99 so <= 100 will always match everything

    // Start fetching the total count of matching properties asynchronously, if requested
    const totalCountPromise: Promise<number|undefined> = !options.totalCount ? new Promise(resolve => resolve(undefined)) : options.tx.queryOne(C`
        MATCH (entry:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})

        // Count "Simple Property Values" attached to the entry type
        WITH entry, entryType
        OPTIONAL MATCH (entryType)-[:${EntryType.rel.HAS_SIMPLE_PROP}]->(spv:${SimplePropertyValue})
        WHERE spv.importance <= ${maxImportance}

        WITH entry, entryType, count(spv) AS spvCount

        // Now count all "normal" property values attached to this entry or its ancestors (for properties that allow inheritance)
        MATCH path = (entry)-[:${Entry.rel.IS_A}*0..50]->(ancestor:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(propEntry)
        OPTIONAL MATCH (propEntry)-[:${Entry.rel.HAS_FEATURE_DATA}]->(propData:${UseAsPropertyData})
        WITH entry, entryType, spvCount, path, propEntry, propData
        WHERE
            // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor
            (length(path) = 2 OR propData.inherits = true)
        AND
            (propData.importance <= ${maxImportance}) OR (propData IS NULL AND ${UseAsPropertyData.defaultImportance} <= ${maxImportance})

        WITH entry, entryType, spvCount, propEntry, min(length(path)) AS distance
        WITH entry, entryType, spvCount, count(propEntry) AS propCount
        WITH spvCount + propCount AS totalCount
    `.RETURN({totalCount: Field.Int})).then(r => r.totalCount);

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
                source: {from: "EntryType"},
                id: spv.id
            } AS propertyData

            UNION ALL

            // Now fetch all "normal" property values attached to this entry or its ancestors (for properties that allow inheritance)
            WITH entry
            MATCH path = (entry)-[:${Entry.rel.IS_A}*0..50]->(ancestor:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(propEntry)
            // Note that the UseAsPropertyData node may be missing if this is a newly created entry or the UseAsProperty feature was recently enabled for this entry type:
            OPTIONAL MATCH (propEntry)-[:${Entry.rel.HAS_FEATURE_DATA}]->(propData:${UseAsPropertyData})
            WITH entry, path, ancestor, pf, propEntry, propData
            WHERE
                // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor
                (length(path) = 2 OR propData.inherits = true)
            AND
                (propData.importance <= ${maxImportance}) OR (propData IS NULL AND ${UseAsPropertyData.defaultImportance} <= ${maxImportance})

            // The way we use min(lengt(path)) below will return only DISTINCT prop entries, so that for each inherited
            // property, we only get the value set by the closest ancestor. e.g. if grandparent->parent->child each
            // have birthDate, child's birthDate will take priority and grandparent/parent's won't be returned
            WITH entry, propEntry, propData, min(length(path)) AS distance, collect(pf) AS pfs, collect(ancestor) as ancestors
            WITH entry, propEntry, propData, distance, head(pfs) AS pf, head(ancestors) AS ancestor

            RETURN {
                label: propEntry.name,
                valueExpression: pf.valueExpression,
                importance: CASE WHEN propData IS NULL THEN ${UseAsPropertyData.defaultImportance} ELSE propData.importance END,
                note: pf.note,

                type: "PropertyValue",
                id: propEntry.id,
                source: CASE distance WHEN 2 THEN {from: "ThisEntry"} ELSE {from: "AncestorEntry", entryId: ancestor.id} END,
                displayAs: propData.displayAs
            } AS propertyData
        }
        RETURN propertyData
        ORDER BY propertyData.importance, propertyData.label, propertyData.type DESC
        SKIP ${skipSafe} LIMIT ${limitSafe}
    `.givesShape({
        propertyData: Field.Record({
            label: Field.String,
            valueExpression: Field.String,
            importance: Field.Int,
            note: Field.String,

            type: Field.String,
            source: Field.Any,
            id: Field.VNID,
            displayAs: Field.NullOr.String,
        }),
    }));

    // deno-lint-ignore no-explicit-any
    const result: any = data.map(d => d.propertyData);
    if (options.totalCount) {
        result.totalCount = await totalCountPromise;
    }
    for (const r of result) {
        if (r.type === "SimplePropertyValue") {
            // SimplePropertyValues should not have the displayAs attribute at all.
            delete r["displayAs"];
        }
    }

    return result;
}
