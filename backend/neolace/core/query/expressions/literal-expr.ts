import { QueryExpression } from "../expression.ts";
import { ConcreteValue, hasLiteralExpression, IHasLiteralExpression } from "../values.ts";
import { QueryEvaluationError } from "../errors.ts";
import { QueryContext } from "../context.ts";

/**
 * LiteralExpression: a simple constant expression that holds a primitive value: an integer, a boolean, etc.
 * 
 * A string can be a literal expression, but some string expressions that contain queries are not literal expressions.
 * e.g. "hello" is a string literal, but "{1 + 1} is two" is not.
 */
export class LiteralExpression extends QueryExpression {
    private readonly value: ConcreteValue & IHasLiteralExpression;

    constructor(value: ConcreteValue) {
        super();
        if (!hasLiteralExpression(value)) {
            throw new QueryEvaluationError(`Internal error - the given value is not a literal.`);
        }
        this.value = value;
    }

    // deno-lint-ignore require-await
    public async getValue(_context: QueryContext) {
        return this.value;
    }

    public toString(): string {
        return this.value.asLiteral();
    }
}
