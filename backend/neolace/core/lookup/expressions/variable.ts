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
import { LookupEvaluationError } from "../errors.ts";
import { ErrorValue, LookupValue } from "../values.ts";

/**
 * A variable is a placeholder that references a value.
 *
 * Note: currently 'this' is not a variable; it is a separate, unique expression. We may want to make it a variable
 * in the future for consistency.
 */
export class Variable extends LookupExpression {
    constructor(
        public readonly variableName: string,
    ) {
        super();
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        if (this.variableName === "this") {
            throw new LookupEvaluationError(`"${this.variableName}" cannot be used as a variable name.`);
        }
        return context.variables.get(this.variableName) ??
            new ErrorValue(new LookupEvaluationError(`Undefined variable "${this.variableName}"`));
    }

    public toString(): string {
        return this.variableName;
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(this);
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        fn(this);
    }
}
