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

        if (depth.value < 1n || depth.value > 10n) {
            throw new LookupEvaluationError(`Invalid depth for andRelated(): ${depth}`);
        }

        return new LazyEntrySetValue(
            context,
            C`
            ${startingEntry.cypherQuery}
            MATCH path = (entry)-[:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}*0..${
                C(String(depth.value))
            }]-(relative:${Entry})
            WITH relative, min(length(path)) AS distance
            ORDER BY distance, relative.name

            WITH relative AS entry, {distance: distance} AS annotations
        `,
            {
                annotations: { distance: dbDistanceToValue },
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
