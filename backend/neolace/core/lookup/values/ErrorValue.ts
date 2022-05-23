import { LookupError } from "../errors.ts";
import { ConcreteValue } from "./base.ts";

/**
 * An error value - represents an error.
 *
 * Evaluating expressions will always throw an exception, not return an error value. However, in some use cases it makes
 * sense to catch those exceptions and convert them to error values, so that a value is always returned.
 */
export class ErrorValue extends ConcreteValue {
    public readonly error: LookupError;

    constructor(error: LookupError) {
        super();
        this.error = error;
    }

    public override asLiteral() {
        return undefined; // There is no literal expression for errors in general
    }

    protected serialize() {
        return { errorClass: this.error.constructor.name, message: this.error.message };
    }
}
