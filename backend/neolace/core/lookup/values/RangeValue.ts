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
import { ConcreteValue, LookupValue } from "./base.ts";

/**
 * A value that respresents a range between a minimum and a maximum
 */
export class RangeValue extends ConcreteValue {
    constructor(
        public readonly min: LookupValue,
        public readonly max: LookupValue,
    ) {
        super();
        // Make sure that the min/max can be compared and that they are equal or that max is greater:
        if (min.compareTo(max) > 0) {
            // This is an internal error; should not be possible for users to achieve this so it's not a Lookup
            throw new LookupError("Tried to construct a range value where the min is greater than the max.");
        }
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `range([${this.min.asLiteral()}, ${this.max.asLiteral()}])`;
    }

    protected serialize() {
        // deno-lint-ignore no-explicit-any
        return { type: "Range" as const, min: this.min as any, max: this.max as any };
    }
}
