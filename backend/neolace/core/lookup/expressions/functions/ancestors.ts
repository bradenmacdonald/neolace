import { C } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../base.ts";
import { IntegerValue, LazyEntrySetValue, LookupValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

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
export class Ancestors extends LookupFunctionOneArg {
    static functionName = "ancestors";
    /** An expression that specifies what entry's ancestors we want to retrieve */
    public get entryExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const startingEntry = await this.entryExpr.getValueAs(LazyEntrySetValue, context);

        // Cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
        const entryPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
        ]);

        return new LazyEntrySetValue(
            context,
            C`
            ${startingEntry.cypherQuery}
            MATCH path = (entry)-[:${Entry.rel.IS_A}*..${C(String(MAX_DEPTH))}]->(ancestor:${Entry})
            WHERE ancestor <> entry  // Never return the starting node as its own ancestor, if the graph is cyclic
            // We want to only return DISTINCT ancestors, and return only the minimum distance to each one.
            WITH ancestor, min(length(path)) AS distance

            WITH ancestor AS entry, {distance: distance} AS annotations
            WHERE ${entryPermissionPredicate}
        `,
            {
                annotations: { distance: dbDistanceToValue },
                orderByClause: C`ORDER BY annotations.distance, entry.name, id(entry)`,
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}

/**
 * andAncestors(entry): returns the ancestors of the specified entry AND the entry itself
 */
export class AndAncestors extends LookupFunctionOneArg {
    static functionName = "andAncestors";
    /** An expression that specifies what entry's ancestors we want to retrieve */
    public get entryExpr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const startingEntry = await this.entryExpr.getValueAs(LazyEntrySetValue, context);

        // Cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
        const entryPermissionPredicate = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, [
            "entry",
        ]);

        return new LazyEntrySetValue(
            context,
            C`
            ${startingEntry.cypherQuery}
            MATCH path = (entry)-[:${Entry.rel.IS_A}*0..${C(String(MAX_DEPTH))}]->(ancestor:${Entry})
            WITH ancestor, min(length(path)) AS distance

            WITH ancestor AS entry, {distance: distance} AS annotations
            WHERE ${entryPermissionPredicate}
        `,
            {
                annotations: { distance: dbDistanceToValue },
                orderByClause: C`ORDER BY annotations.distance, entry.name, id(entry)`,
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
