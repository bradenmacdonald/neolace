/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupExpression } from "./base.ts";
import { LookupContext } from "../context.ts";
import { LambdaValue } from "../values/LambdaValue.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * A lambda expression is an anonymous function that takes an input value and returns a new value based on the input.
 *
 * e.g. (x -> x + 1) is a lambda expression that will add one to the given value.
 *
 * Parentheses are always required around the lambda expression.
 *
 * The argument variable can have almost any name that isn't a reserved keyword, but simple names like 'x', 'y', or 'e'
 * are recommended.
 */
export class Lambda extends LookupExpression {
    constructor(
        public readonly variableName: string,
        public readonly innerExpression: LookupExpression,
    ) {
        super();
    }

    public async getValue(context: LookupContext): Promise<LambdaValue> {
        if (this.variableName === "this") {
            throw new LookupEvaluationError(`"${this.variableName}" cannot be used as a variable name.`);
        }
        // At this point, we don't yet know the value of the argument to the function so we cannot evaluate it.
        return new LambdaValue({ context, variableName: this.variableName, innerExpression: this.innerExpression });
    }

    public toString(): string {
        return `(${this.variableName} -> ${this.innerExpression.toString()})`;
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(new Lambda(this.variableName, this.innerExpression.traverseTreeAndReplace(replacer)));
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        this.innerExpression.traverseTree(fn);
        fn(this);
    }
}
