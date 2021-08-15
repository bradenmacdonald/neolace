import { QueryValue } from "./values.ts";
/**
 * Base class for a Query Expression, something that evaluates to a value.
 */
export abstract class QueryExpression {
    public abstract getValue(): QueryValue;

    /**
     * Format this expression as a string in standard form, recursively.
     * e.g. if this is an addition expression, it could return the string "3 + 4"
     */
    public abstract asString(): string;
}
