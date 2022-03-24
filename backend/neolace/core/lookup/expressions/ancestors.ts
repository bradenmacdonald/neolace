import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import { EntryValue, IntegerValue, LazyEntrySetValue, LookupValue } from "../values.ts";
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
};

/**
 * ancestors(entry): returns the ancestors of the specified entry
 */
export class Ancestors extends LookupExpression {
    // An expression that specifies what entry's ancestors we want to retrieve
    readonly entryExpr: LookupExpression;

    constructor(entryExpr: LookupExpression) {
        super();
        this.entryExpr = entryExpr;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const startingEntry = await this.entryExpr.getValueAs(EntryValue, context);

        return new LazyEntrySetValue(
            context,
            C`
            MATCH (entry:${Entry} {id: ${startingEntry.id}})
            MATCH path = (entry)-[:${Entry.rel.IS_A}*..${C(String(MAX_DEPTH))}]->(ancestor:${Entry})
            WHERE ancestor <> entry  // Never return the starting node as its own ancestor, if the graph is cyclic
            // We want to only return DISTINCT ancestors, and return only the minimum distance to each one.
            WITH ancestor, min(length(path)) AS distance
            ORDER BY distance, ancestor.name

            WITH ancestor AS entry, {distance: distance} AS annotations
        `,
            {
                annotations: { distance: dbDistanceToValue },
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }

    public toString(): string {
        return `ancestors(${this.entryExpr.toString()})`;
    }
}

/**
 * andAncestors(entry): returns the ancestors of the specified entry AND the entry itself
 */
export class AndAncestors extends LookupExpression {
    // An expression that specifies what entry's ancestors we want to retrieve
    readonly entryExpr: LookupExpression;

    constructor(entryExpr: LookupExpression) {
        super();
        this.entryExpr = entryExpr;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const startingEntry = await this.entryExpr.getValueAs(EntryValue, context);

        return new LazyEntrySetValue(
            context,
            C`
            MATCH (entry:${Entry} {id: ${startingEntry.id}})
            MATCH path = (entry)-[:${Entry.rel.IS_A}*0..${C(String(MAX_DEPTH))}]->(ancestor:${Entry})
            WITH ancestor, min(length(path)) AS distance
            ORDER BY distance, ancestor.name

            WITH ancestor AS entry, {distance: distance} AS annotations
        `,
            {
                annotations: { distance: dbDistanceToValue },
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }

    public toString(): string {
        return `andAncestors(${this.entryExpr.toString()})`;
    }
}
