/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
 * descendants(entry): returns the descendants of the specified entry
 */
export class Descendants extends LookupFunctionOneArg {
    static functionName = "descendants";
    /** An expression that specifies what entry's descendants we want to retrieve */
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
            MATCH path = (descendant:${Entry})-[:${Entry.rel.IS_A}*..${C(String(MAX_DEPTH))}]->(entry)
            WHERE descendant <> entry  // Never return the starting node as its own descendant, if the graph is cyclic
            // We want to only return DISTINCT descendants, and return only the minimum distance to each one.
            WITH descendant, min(length(path)) AS distance

            WITH descendant AS entry, {distance: distance} AS annotations
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
 * andDescendants(entry): returns the descendants of the specified entry AND the entry itself
 */
export class AndDescendants extends LookupFunctionOneArg {
    static functionName = "andDescendants";
    /** An expression that specifies what entry's descendants we want to retrieve */
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
            MATCH path = (descendant:${Entry})-[:${Entry.rel.IS_A}*0..${C(String(MAX_DEPTH))}]->(entry)
            WITH descendant, min(length(path)) AS distance

            WITH descendant AS entry, {distance: distance} AS annotations
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
