import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { QueryExpression } from "../expression.ts";
import { LazyEntrySetValue, EntryValue, IntegerValue } from "../values.ts";
import { QueryEvaluationError } from "../errors.ts";
import { QueryContext } from "../context.ts";

/**
 * ancestors(entry): returns the ancestors of the specified entry
 */
 export class Ancestors extends QueryExpression {

    // An expression that specifies what entry's ancestors we want to retrieve
    readonly entryExpr: QueryExpression;

    constructor(entryExpr: QueryExpression) {
        super();
        this.entryExpr = entryExpr;
    }

    public async getValue(context: QueryContext) {
        const maxDepth = 50;
        const startingEntry = await this.entryExpr.getValueAs(context, EntryValue);

        return new LazyEntrySetValue(context, C`
            MATCH (entry:${Entry} {id: ${startingEntry.id}})
            MATCH path = (entry)-[:${Entry.rel.IS_A}*..${C(String(maxDepth))}]->(ancestor:${Entry})
            WHERE ancestor <> entry  // Never return the starting node as its own ancestor, if the graph is cyclic
            // We want to only return DISTINCT ancestors, and return only the minimum distance to each one.
            WITH ancestor, min(length(path)) AS distance
            ORDER BY distance, ancestor.name

            WITH ancestor AS entry, {distance: distance} AS annotations
        `, {annotations: {distance: (val) => {
            if (typeof val === "bigint") {
                return new IntegerValue(val);
            } else {
                throw new QueryEvaluationError("Unexpected data type for 'distance' while evaluating Query Expression.");
            }
        }}});
    }

    public toString(): string {
        return `ancestors(${this.entryExpr.toString()})`;
    }
}
