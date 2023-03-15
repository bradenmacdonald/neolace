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
import { AnnotatedValue, StringValue } from "../../values.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionOneArg } from "./base.ts";

/**
 * lookupDemo([expression])
 *
 * Render an interactive demo of the given lookup expression, showing the expression, the result, and the ability for
 * the user to edit it and see the new result.
 */
export class LookupDemo extends LookupFunctionOneArg {
    static functionName = "lookupDemo";

    /** This is the expression that we're going to show */
    public get expr(): LookupExpression {
        return this.firstArg;
    }

    public async getValue(context: LookupContext): Promise<AnnotatedValue> {
        const value = await this.expr.getValue(context);
        // We can't return annotations on a lazy value, so make sure this is a concrete value:
        const concreteValue = await value.makeConcrete();

        return new AnnotatedValue(concreteValue, {
            displayAsEditableDemoFromExpression: new StringValue(this.expr.toString()),
        });
    }
}
