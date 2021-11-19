// deno-lint-ignore-file require-await no-unused-vars
import { C, VNID, WrappedTransaction, Field } from "neolace/deps/vertex-framework.ts";
// import { Entry } from "neolace/core/entry/Entry.ts";
// import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
// import { EntryType } from "neolace/core/schema/EntryType.ts";



/**
 * Data structure used when querying for property values on an entry, including those explicitly
 * set and inherited from other entries. This is not the format returned by the API, which
 * consolidates the values together into a single value per property and returns a serialized
 * lookup value, not a lookup expression.
 */
type EntryPropertyValueSet = {
    property: {
        id: VNID,
        name: string,
        importance: number,
    },
    values: Array<{
        factId: VNID,
        valueExpression: string,
        note: string,
        source: {from: "EntryType"}|{from: "ThisEntry"}|{from: "AncestorEntry", entryId: VNID},
    }>,
};


/**
 * Get all property values associated with an Entry.
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
}): Promise<EntryPropertyValueSet[] & (TC extends true ? {totalCount: number} : unknown)> {

    throw new Error("Needs to be re-implemented.");
    /*
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
    */
}


/**
 * Get a single property value associated with an Entry, including SimplePropertyValues and (regular) property values
 * from PropertyFacts.
 * 
 * Can search by property ID or by label (exact match only).
 */
 export async function getEntryProperty(entryId: VNID, options: ({propertyId: VNID}|{labelExact: string})&{tx: WrappedTransaction}): Promise<EntryPropertyValueSet|undefined> {

    throw new Error("Needs to be re-implemented.");
    /*
    const matchClauseSPV = "propertyId" in options ? C`{id: ${options.propertyId}}` : C`{label: ${options.labelExact}}`;
    const matchClausePE =  "propertyId" in options ? C`{id: ${options.propertyId}}` : C`{name: ${options.labelExact}}`;

    const data = await options.tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})

        WITH entry, entryType
        CALL {
            WITH entry, entryType
            // Check "Simple Property Values" attached to the entry type

            MATCH (entryType)-[:${EntryType.rel.HAS_SIMPLE_PROP}]->(spv:${SimplePropertyValue} ${matchClauseSPV})
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

            // Check "normal" property values attached to this entry or its ancestors (for properties that allow inheritance)
            WITH entry
            MATCH path = (entry)-[:${Entry.rel.IS_A}*0..50]->(ancestor:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(propEntry ${matchClausePE})
            // Note that the UseAsPropertyData node may be missing if this is a newly created entry or the UseAsProperty feature was recently enabled for this entry type:
            OPTIONAL MATCH (propEntry)-[:${Entry.rel.HAS_FEATURE_DATA}]->(propData:${UseAsPropertyData})
            WITH entry, path, ancestor, pf, propEntry, propData, length(path) AS distance
            WHERE
                // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor
                (length(path) = 2 OR propData.inherits = true)

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
            LIMIT 1
        }
        RETURN propertyData LIMIT 1
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

    if (data.length === 0) {
        return undefined;
    }
    // deno-lint-ignore no-explicit-any
    const result = data[0].propertyData as any;
    if (result.type === "SimplePropertyValue") {
        // SimplePropertyValues should not have the displayAs attribute at all.
        delete result["displayAs"];
    }

    return result;
    */
}
