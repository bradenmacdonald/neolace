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
import { LookupValue, NullValue } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";

/**
 * This expression is used to get an attribute of a value.
 *
 * For example, entries have .id, .name, .key, .description as attributes.
 *
 * In addition, any value can have additional attributes added onto it using 'annotations'
 */
export class GetAttribute extends LookupExpression {
    constructor(
        public readonly attributeName: string,
        /** The expression whose attribute we want to get */
        public readonly expression: LookupExpression,
    ) {
        super();
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        const obj = await this.expression.getValue(context);
        const result = await obj.getAttribute(this.attributeName, context);

        if (result !== undefined) {
            return result;
        }

        // Standard annotations like 'slot', 'note', or 'detail' may not be present but shouldn't give errors when
        // the user tries to access them and they're blank.
        if (["name", "id", "slot", "note", "detail"].includes(this.attributeName)) {
            return new NullValue();
        }

        // But otherwise we want to give a clear error so that users who forget parentheses on a function get a clear
        // warning. e.g. 'allEntries().count' should raise an error because they meant 'allEntries().count()'
        throw new LookupEvaluationError(`Unknown attribute/annotation: ${this.attributeName}`);
    }

    public toString(): string {
        return `${this.expression.toString()}.${this.attributeName}`;
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(new GetAttribute(this.attributeName, this.expression.traverseTreeAndReplace(replacer)));
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        this.expression.traverseTree(fn);
        fn(this);
    }
}
