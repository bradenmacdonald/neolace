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
import { LazyIterableValue } from "../values.ts";
import { LookupContext } from "../context.ts";

/**
 * A list expression is an immutable array of values/expressions.
 * e.g. [1, 2, 3, 4]
 *
 * The values do not have to be of the same type.
 */
export class List extends LookupExpression {
    readonly items: LookupExpression[];

    constructor(items: LookupExpression[]) {
        super();
        this.items = items;
    }

    public async getValue(context: LookupContext): Promise<LazyIterableValue> {
        // We return a lazy value so that e.g. you can get the count() or first() of the list without evaluating any
        // expensive expressions within the list.
        return new LazyIterableValue({
            context,
            getCount: async () => {
                return BigInt(this.items.length);
            },
            getSlice: (offset: bigint, numItems: bigint) => {
                return Promise.all(
                    this.items.slice(Number(offset), Number(offset + numItems)).map((v) => v.getValue(context)),
                );
            },
            sourceExpression: this,
            sourceExpressionEntryId: context.entryId,
        });
    }

    public toString(): string {
        const itemsAsStrings = this.items.map((expr) => expr.toString());
        return "[" + itemsAsStrings.join(", ") + "]";
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(new List(this.items.map((item) => item.traverseTreeAndReplace(replacer))));
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        this.items.forEach((item) => item.traverseTree(fn));
        fn(this);
    }
}
