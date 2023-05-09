/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import type * as api from "neolace/deps/neolace-sdk.ts";
import { ConcreteValue, LookupValue } from "./base.ts";

/**
 * A value that respresents a boolean
 */
export class BooleanValue extends ConcreteValue {
    readonly value: boolean;

    constructor(value: boolean) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return this.value ? "true" : "false";
    }

    protected serialize(): api.BooleanValue {
        return { type: "Boolean" as const, value: this.value };
    }

    protected override doCompareTo(otherValue: LookupValue): number {
        if (otherValue instanceof BooleanValue) {
            return otherValue.value === this.value ? 0 : (otherValue.value ? -1 : 1);
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
