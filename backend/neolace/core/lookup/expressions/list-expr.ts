import { LookupExpression } from "../expression.ts";
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

    public async getValue(context: LookupContext) {
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
        });
    }

    public toString(): string {
        const itemsAsStrings = this.items.map((expr) => expr.toString());
        return "[" + itemsAsStrings.join(", ") + "]";
    }
}
