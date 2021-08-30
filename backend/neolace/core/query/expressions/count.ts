import { QueryExpression } from "../expression.ts";
import { QueryValue, ICountableValue, IntegerValue } from "../values.ts";
import { QueryContext } from "../context.ts";
import { QueryEvaluationError } from "../errors.ts";


function isCountableValue(value: unknown): value is ICountableValue {
    return value instanceof QueryValue && (value as unknown as ICountableValue).hasCount === true;
}


/**
 * count(entry): returns the count of the specified value
 * -> Lazy Query: give the number of results (rows)
 * -> List: give the number of items in the list
 */
 export class Count extends QueryExpression {

    // An expression that specifies what entry's ancestors we want to retrieve
    readonly exprToCount: QueryExpression;

    constructor(exprToCount: QueryExpression) {
        super();
        this.exprToCount = exprToCount;
    }

    public async getValue(context: QueryContext) {
        const valueToCount = await this.exprToCount.getValue(context);
        if (isCountableValue(valueToCount)) {
            return new IntegerValue(await valueToCount.getCount());
        } else {
            throw new QueryEvaluationError(`The expression "${this.exprToCount.toString()}" cannot be counted with count().`);
        }
    }

    public toString(): string {
        return `count(${this.exprToCount.toString()})`;
    }
}
