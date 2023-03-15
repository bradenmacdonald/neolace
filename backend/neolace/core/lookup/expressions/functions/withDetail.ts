/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupExpression } from "../base.ts";
import {
    AnnotatedValue,
    EntryValue,
    ErrorValue,
    isIterableValue,
    LazyIterableValue,
    LookupValue,
} from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { Map } from "./map.ts";
import { Lambda } from "../lambda.ts";
import { Variable } from "../variable.ts";
import { Annotate } from "./annotate.ts";
import { GetProperty } from "./get.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LiteralExpression } from "../../expressions.ts";

/**
 * withDetail([entry set], prop=...)
 *
 * Given a set of entries, annotate them with a particular property so that the specified property value will be
 * displayed next to each entry, e.g. entry("canada").withDetail(prop=prop("population")) would display
 * Canada (38 million)
 *
 * This is just a shortcut for
 * map([entry set], apply=(e -> e.annotate(detail=e.get(prop=...))))
 *
 * This can also be used to add a detail annotation to a single entry: entry("...").withDetail(prop=...)
 */
export class WithDetail extends LookupFunctionWithArgs {
    static functionName = "withDetail";

    /** An expression that specifies which entries we want to annotate */
    public get fromEntriesExpr(): LookupExpression {
        return this.firstArg;
    }

    /** An expression that specifies what property we want to retrieve */
    public get propertyExpr(): LookupExpression {
        return this.otherArgs["prop"];
    }

    protected override validateArgs(): void {
        this.requireArgs(["prop"]);
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        if (isIterableValue(await this.fromEntriesExpr.getValue(context))) {
            // TODO: in the future, this could be more optimized, to pre-fetch the property values for all entries instead
            // of fetching it one at a time per entry within map(). Alternately map() can be made to be able to pre-fetch
            // values and in that case, it won't be necessary to change this withDetail() function at all.
            const result = await context.evaluateExpr(
                new Map(this.fromEntriesExpr, {
                    apply: new Lambda(
                        "entry",
                        new Annotate(new Variable("entry"), {
                            detail: new GetProperty(new Variable("entry"), { prop: this.propertyExpr }),
                        }),
                    ),
                }),
            );
            if (result instanceof ErrorValue) {
                return result;
            } else if (!(result instanceof LazyIterableValue)) {
                throw new LookupEvaluationError("Internal error - expected map() to return a LazyIterableValue");
            }
            // And update the source expression so that "show more" links will properly use this withDetail() expression
            // and not change to show the full "map(...)" expression
            return result.cloneWithSourceExpression(this, context.entryId);
        } else {
            // We also allow .withDetail() to work with a single entry:
            const entryValue = await this.fromEntriesExpr.getValueAs(EntryValue, context);
            const expr = new GetProperty(new LiteralExpression(entryValue), { prop: this.propertyExpr });
            return new AnnotatedValue(entryValue, {
                detail: await (await context.evaluateExpr(expr)).makeConcrete(),
            });
        }
    }
}
