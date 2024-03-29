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
import { LookupFunctionWithArgs } from "./base.ts";

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
 * andRelated(entry): returns all directly related entries AND the entry itself
 */
export class AndRelated extends LookupFunctionWithArgs {
    static functionName = "andRelated";

    public get entryExpr(): LookupExpression {
        return this.firstArg;
    }
    public get depthExpr(): LookupExpression | undefined {
        return this.otherArgs["depth"];
    }

    protected override validateArgs(): void {
        this.requireArgs([], { optional: ["depth"] });
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const startingEntry = await this.entryExpr.getValueAs(LazyEntrySetValue, context);
        const depth = await this.depthExpr?.getValueAs(IntegerValue, context) ?? new IntegerValue(1);

        if (depth.value < 1n || depth.value > 4n) {
            throw new LookupEvaluationError(`Invalid depth for andRelated(): ${depth.value}`);
        }

        return new LazyEntrySetValue(
            context,
            C`
            ${startingEntry.cypherQuery}
            MATCH path = (entry)-[:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}*0..${
                C(String(depth.value))
            }]-(relative:${Entry})
            WITH relative, min(length(path)) AS distance

            WITH relative AS entry, {distance: distance} AS annotations
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
