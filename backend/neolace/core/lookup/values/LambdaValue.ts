/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import type { LookupContext } from "../context.ts";
import type { LookupExpression } from "../expressions/base.ts";
import { ConcreteValue, LazyValue } from "./base.ts";
import { LookupEvaluationError } from "../errors.ts";
import { ErrorValue } from "../values.ts";

/**
 * A lambda value represents an anonymous function that has not yet been evaluated.
 * See expressions/lambda.ts for details.
 */
export class LambdaValue extends LazyValue {
    public readonly variableName: string;
    public readonly innerExpression: LookupExpression;

    constructor({ context, variableName, innerExpression }: {
        context: LookupContext;
        variableName: string;
        innerExpression: LookupExpression;
    }) {
        super(context);
        this.variableName = variableName;
        this.innerExpression = innerExpression;
    }

    public override async toDefaultConcreteValue(): Promise<ConcreteValue> {
        return new ErrorValue(
            new LookupEvaluationError("Cannot return/use a lambda expression (anonymous function) in that way."),
        );
    }
}
