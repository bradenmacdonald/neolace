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
import { AnnotatedValue, ConcreteValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";

const reservedKeys = ["key", "value", "id", "type"];

/**
 * annotate(value, [key]=value)
 *
 * Given a value, 'annotate' it with additional information. This can influence how the value is sorted, or displayed
 * in the frontend.
 */
export class Annotate extends LookupFunctionWithArgs {
    static functionName = "annotate";

    /** The value to annotate */
    public get valueExpr(): LookupExpression {
        return this.firstArg;
    }

    protected override validateArgs(): void {
        // We accept any arguments so no special validation required here.
    }

    public async getValue(context: LookupContext): Promise<AnnotatedValue> {
        const value = await this.valueExpr.getValue(context).then((v) => v.makeConcrete());
        const newAnnotations: Record<string, ConcreteValue> = {};
        for (const [key, expr] of Object.entries(this.otherArgs)) {
            // In the future we may allow annotate(key="key with spaces", value=...) so for now don't allow annotations
            // called "key" or "value"
            if (reservedKeys.includes(key)) {
                throw new LookupEvaluationError(
                    `annotate() cannot create an annotation called "${key}" as that's a reserved keyword.`,
                );
            }
            newAnnotations[key] = await expr.getValue(context).then((v) => v.makeConcrete());
        }
        return new AnnotatedValue(value, newAnnotations); // If 'value' is already an AnnotatedValue, this will merge the new annotations and the existing ones.
    }
}
