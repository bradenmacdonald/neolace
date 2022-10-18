import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";

/**
 * Data structure used when querying for property values on an entry, including those explicitly
 * set and inherited from other entries. This is not the format returned by the API, which
 * consolidates the values together into a single value per property and returns a serialized
 * lookup value, not a lookup expression.
 */
export type EntryPropertyValueSet = {
    entryId?: VNID;
    property: {
        id: VNID;
        name: string;
        rank: number;
        /** Default value. Only loaded from the database if no explicit value is set. */
        default: string | null;
        /** A markdown string with "{value}" placeholders, used to format the value, e.g. make it a link or italic. */
        displayAs?: string;
    };
    facts: Array<{
        propertyFactId: VNID;
        valueExpression: string;
        note: string;
        rank: number;
        slot?: string;
        source: { from: "ThisEntry" } | { from: "AncestorEntry"; entryId: VNID };
    }>;
};

/**
 * Get all property values associated with an Entry.
 * Or, get a single property value associated with a specific entry.
 * Or, get all properties values associated with a set of entries.
 *
 * Basically, this giant, complex query encapsulates all of our logic about how to compute property values, and deals
 * with complexity like inherited property values and "slots" where appropriate.
 *
 * This function includes inherited properties and will order the results by rank.
 *
 * This function however does NOT check permissions. You should separately ensure that the user has the relevant
 * permissions, such as CorePerm.viewEntryProperty.
 */
export async function getEntryProperties<TC extends true | undefined = undefined>(entryId: VNID | VNID[], options: {
    tx: WrappedTransaction;
    maxRank?: number;
    skip?: number;
    limit?: number;
    /** Should the total count of matching properties be included in the results? */
    totalCount?: TC;
    /** Instead of fetching all properties, fetch just one (used by getEntryProperty()) */
    specificPropertyId?: VNID;
}): Promise<EntryPropertyValueSet[] & (TC extends true ? { totalCount: number } : unknown)> {
    // Neo4j doesn't allow normal query variables to be used for skip/limit so we have to carefully ensure these values
    // are safe (are just plain numbers) then format them for interpolation in the query string as part of the cypher
    // expression (not as variables)
    const skipSafe = C(String(Number(options.skip ?? 0)));
    const limitSafe = C(String(Number(Number(options.limit ?? 100))));

    const maxRank = options.maxRank ?? 100; // Importance is in the range 0-99 so <= 100 will always match everything

    if (options.specificPropertyId && options.totalCount) {
        throw new Error(
            `Cannot request totalCount along with specific property ID - no need for wasting extra calculation when count is either 0 or 1.`,
        );
    }

    const multipleEntries = Array.isArray(entryId);
    const entryFilter = (
        multipleEntries
            ? C`MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType}) WHERE entry.id IN ${entryId}`
            : C`MATCH (entry:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})`
    );

    if (multipleEntries && options.totalCount) {
        throw new Error(`
            totalCount cannot yet be used when retrieving properties from more than one entry.
            (Just because we haven't implemented it yet; it's fine to do in principle...)
        `);
    }

    // Start fetching the total count of matching properties asynchronously, if requested
    // TBD: is this really asynchronous, if it's part of the same transaction? Probably not.
    const totalCountPromise: Promise<number | undefined> = !options.totalCount
        ? new Promise((resolve) => resolve(undefined))
        : options.tx.queryOne(C`
        MATCH (entry:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})

        MATCH (prop:${Property})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
            WHERE
                prop.rank <= ${maxRank}
                AND (
                    prop.default <> ""
                    OR exists(
                        (entry)-[:${Entry.rel.PROP_FACT}]->(:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
                    )
                    OR (prop.inheritable AND exists(
                        (entry)-[:${Entry.rel.IS_A}*1..50]->(:${Entry})-[:${Entry.rel.PROP_FACT}]->(:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
                    ))
                )

        RETURN count(prop) AS totalCount
    `.givesShape({ totalCount: Field.Int })).then((r) => r.totalCount);

    const data = await options.tx.query(C`
        ${entryFilter}

        CALL {
            ///////////////////////////////////////////////////////////////////////////////////
            // PART 1: Fetch all non-slot property values attached to this entry or its ancestors (for properties that allow inheritance)
            ///////////////////////////////////////////////////////////////////////////////////
            WITH entry, entryType

            // See query below (MATCH in Part 2) to understand this path:
            MATCH path = allShortestPaths((entry)-[:${Entry.rel.IS_A}|${Entry.rel.PROP_FACT}|${PropertyFact.rel.FOR_PROP}*1..50]->(prop {enableSlots: false})),
                (prop)-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
                ${options.specificPropertyId ? C`WHERE prop.id = ${options.specificPropertyId}` : C``}
            WITH entry, path, prop
            WHERE
                // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor
                (length(path) = 2 OR prop.inheritable = true)
            AND
                (prop.rank <= ${maxRank})
            
            WITH entry, prop, length(path) AS distance, nodes(path)[length(path) - 2] AS ancestor, nodes(path)[length(path) - 1] AS pf

            RETURN {
                entryId: entry.id,
                property: prop {.id, .name, .rank, default: null, .displayAs},
                facts: collect({
                    propertyFactId: pf.id,
                    valueExpression: pf.valueExpression,
                    note: pf.note,
                    rank: pf.rank,
                    slot: pf.slot,
                    source: CASE distance WHEN 2 THEN {from: "ThisEntry"} ELSE {from: "AncestorEntry", entryId: ancestor.id} END
                })
            } AS propertyData

            
            ///////////////////////////////////////////////////////////////////////////////////
            // PART 2: Fetch all slot-enabled property values attached to this entry or its ancestors (for properties that allow inheritance)
            ///////////////////////////////////////////////////////////////////////////////////

            // This query is very slow, so it's only used for properties that strictly require slots.
            
            UNION ALL // ALL because it's presumably faster than DISTINCT and we have no overlap here
            WITH entry, entryType
            MATCH path = (entry)-[:${Entry.rel.IS_A}*0..50]->(ancestor:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop {enableSlots: true}),
                (prop)-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
                ${options.specificPropertyId ? C`WHERE prop.id = ${options.specificPropertyId}` : C``}
            WITH entry, path, ancestor, pf, prop
            WHERE
                // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor
                (length(path) = 2 OR prop.inheritable = true)
            AND
                (prop.rank <= ${maxRank})

            // We use minDistance below so that for each inherited property, we only get the
            // values set by the closest ancestor. e.g. if grandparent->parent->child each
            // have birthDate, child's birthDate will take priority and grandparent/parent's won't be returned
            WITH entry, prop, pf.slot AS slot, min(length(path)) AS minDistance, collect({pf: pf, ancestor: ancestor, distance: length(path)}) AS facts
            // Now filter to only have values from the closest ancestor:
            WITH entry, prop, minDistance, facts
            UNWIND facts as f
            WITH entry, prop, f WHERE f.distance = minDistance
            WITH entry, prop, f.pf AS pf, f.distance AS distance, f.ancestor AS ancestor

            RETURN {
                entryId: entry.id,
                property: prop {.id, .name, .rank, default: null, .displayAs},
                facts: collect({
                    propertyFactId: pf.id,
                    valueExpression: pf.valueExpression,
                    note: pf.note,
                    rank: pf.rank,
                    slot: pf.slot,
                    source: CASE distance WHEN 2 THEN {from: "ThisEntry"} ELSE {from: "AncestorEntry", entryId: ancestor.id} END
                })
            } AS propertyData
            
            ///////////////////////////////////////////////////////////////////////////////////
            // PART 3: Find any properties which aren't explicitly set on the entry but which have default values.
            ///////////////////////////////////////////////////////////////////////////////////
            
            UNION ALL // ALL because it's presumably faster than DISTINCT and we have no overlap here
            WITH entry, entryType

            MATCH (prop)-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
                WHERE
                    ${options.specificPropertyId ? C`prop.id = ${options.specificPropertyId} AND` : C``}
                    prop.default <> ""
                    AND prop.rank <= ${maxRank}
                    AND NOT exists((entry)-[:${Entry.rel.IS_A}*0..50]->(:${Entry})-[:PROP_FACT]->(:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop))

            RETURN {
                entryId: entry.id,
                property: prop {.id, .name, .rank, .default, .displayAs},
                facts: []
            } AS propertyData
        }

        RETURN propertyData
        ORDER BY propertyData.entryId, propertyData.property.rank, propertyData.property.name
        SKIP ${skipSafe} LIMIT ${limitSafe}
    `.givesShape({
        propertyData: Field.Record({
            entryId: Field.VNID,
            property: Field.Record({
                id: Field.VNID,
                name: Field.String,
                rank: Field.Int,
                default: Field.String,
                displayAs: Field.String,
            }),
            facts: Field.List(Field.Record({
                propertyFactId: Field.VNID,
                valueExpression: Field.String,
                note: Field.String,
                rank: Field.Int,
                slot: Field.String,
                source: Field.Any,
            })),
        }),
    }));

    // deno-lint-ignore no-explicit-any
    const result: any = data.map((d) => d.propertyData);

    // Add the total count onto the array, if requested.
    if (options.totalCount) {
        result.totalCount = await totalCountPromise;
    }

    // Post processing
    for (const prop of result) {
        if (prop.property.displayAs === "") {
            delete prop.property.displayAs;
        }
        if (!multipleEntries) {
            // The entry ID is only useful if we are retrieving properties from multiple entries.
            // Returning it in other single-entry cases makes the test code more complicated, so we avoid it.
            delete prop.entryId;
        }
        // Sort property values by slot, then by rank.
        // We do this at the end because it's more efficient to do once most irrelevant/inherited facts are stripped out,
        // and because it's a little tricky to do in the Cypher query due to its structure and use of collect()
        // deno-lint-ignore no-explicit-any
        prop.facts.sort((pfA: any, pfB: any) =>
            (pfA.slot.localeCompare(pfB.slot)) * 100_000_000 + (pfA.rank - pfB.rank)
        );
        // Remove "slot" property if it's empty
        // deno-lint-ignore no-explicit-any
        prop.facts.forEach((pf: any) => {
            if (pf.slot === "") {
                delete pf.slot;
            }
        });
    }

    return result;
}

/**
 * Get the value[s] from a single property that are set on an entry (or inherited from an ancestor entry)
 */
export async function getEntryProperty(
    { entryId, propertyId, tx }: { entryId: VNID; propertyId: VNID; tx: WrappedTransaction },
): Promise<EntryPropertyValueSet | undefined> {
    const results = await getEntryProperties(entryId, {
        limit: 1,
        specificPropertyId: propertyId,
        tx,
    });
    if (results.length === 1) {
        return results[0];
    }
    return undefined;
}

/**
 * Get the values of a single property from many different entries.
 */
export async function getEntriesProperty(
    tx: WrappedTransaction,
    entryIds: VNID[],
    specificPropertyId: VNID,
): Promise<(EntryPropertyValueSet & { entryId: VNID })[]> {
    return getEntryProperties(entryIds, { tx, specificPropertyId }) as Promise<
        (EntryPropertyValueSet & { entryId: VNID })[]
    >;
}
