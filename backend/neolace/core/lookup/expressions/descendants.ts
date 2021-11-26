import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import { LazyEntrySetValue, EntryValue, IntegerValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

const MAX_DEPTH = 50;

/**
 * Helper function to read annotated distance values from a lookup result
 */
const dbDistanceToValue = (dbValue: unknown): IntegerValue => {
    if (typeof dbValue === "bigint") {
        return new IntegerValue(dbValue);
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'distance' while evaluating lookup expression.");
    }
}

/**
 * descendants(entry): returns the descendants of the specified entry
 */
 export class Descendants extends LookupExpression {

    // An expression that specifies what entry's descendants we want to retrieve
    readonly entryExpr: LookupExpression;

    constructor(entryExpr: LookupExpression) {
        super();
        this.entryExpr = entryExpr;
    }

    public async getValue(context: LookupContext) {
        const startingEntry = await this.entryExpr.getValueAs(context, EntryValue);

        return new LazyEntrySetValue(context, C`
            MATCH (entry:${Entry} {id: ${startingEntry.id}})
            MATCH path = (descendant:${Entry})-[:${Entry.rel.IS_A}*..${C(String(MAX_DEPTH))}]->(entry)
            WHERE descendant <> entry  // Never return the starting node as its own descendant, if the graph is cyclic
            // We want to only return DISTINCT descendants, and return only the minimum distance to each one.
            WITH descendant, min(length(path)) AS distance
            ORDER BY distance, descendant.name

            WITH descendant AS entry, {distance: distance} AS annotations
        `, {annotations: {distance: dbDistanceToValue}});
    }

    public toString(): string {
        return `descendants(${this.entryExpr.toString()})`;
    }
}

/**
 * andDescendants(entry): returns the descendants of the specified entry AND the entry itself
 */
 export class AndDescendants extends LookupExpression {

    // An expression that specifies what entry's descendants we want to retrieve
    readonly entryExpr: LookupExpression;

    constructor(entryExpr: LookupExpression) {
        super();
        this.entryExpr = entryExpr;
    }

    public async getValue(context: LookupContext) {
        const startingEntry = await this.entryExpr.getValueAs(context, EntryValue);

        return new LazyEntrySetValue(context, C`
            MATCH (entry:${Entry} {id: ${startingEntry.id}})
            MATCH path = (descendant:${Entry})-[:${Entry.rel.IS_A}*0..${C(String(MAX_DEPTH))}]->(entry)
            WITH descendant, min(length(path)) AS distance
            ORDER BY distance, descendant.name

            WITH descendant AS entry, {distance: distance} AS annotations
        `, {annotations: {distance: dbDistanceToValue}});
    }

    public toString(): string {
        return `andDescendants(${this.entryExpr.toString()})`;
    }
}
