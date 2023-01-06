import { LookupExpression } from "./base.ts";
import { ConcreteValue, hasLiteralExpression, IHasLiteralExpression } from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

/**
 * LiteralExpression: a simple constant expression that holds a primitive value: an integer, a boolean, etc.
 *
 * A string can be a literal expression, but some string expressions that contain expressions are not literal expressions.
 * e.g. "hello" is a string literal, but `{1 + 1} is two` is not.
 */
export class LiteralExpression extends LookupExpression {
    public readonly value: ConcreteValue & IHasLiteralExpression;

    constructor(value: ConcreteValue) {
        super();
        if (!hasLiteralExpression(value)) {
            throw new LookupEvaluationError(`Internal error - the given value is not a literal.`);
        }
        this.value = value;
    }

    public override async getValue(_context: LookupContext) {
        return this.value;
    }

    public toString(): string {
        return (this.value as IHasLiteralExpression).asLiteral();
    }

    public override traverseTreeAndReplace(replacer: (e: LookupExpression) => LookupExpression): LookupExpression {
        return replacer(this);
    }

    public override traverseTree(fn: (expr: LookupExpression) => void): void {
        fn(this);
    }
}
