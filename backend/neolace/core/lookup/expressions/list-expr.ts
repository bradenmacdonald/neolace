import { LookupExpression } from "../expression.ts";
import { LazyListValue } from "../values.ts";
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
        const values = await Promise.all(
            this.items.map(expr => expr.getValue(context)),
        );
        // We return a lazy list so that e.g. you can get the count() of the list without evaluating any expensive
        // expressions within the list.
        return new LazyListValue(context, values);
    }

    public toString(): string {
        const itemsAsStrings = this.items.map(expr => expr.toString());
        return "[" + itemsAsStrings.join(", ") + "]";
    }
}
