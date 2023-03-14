/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
        return { type: "Error" as const, errorClass: this.error.constructor.name, message: this.error.message };
    }
}
