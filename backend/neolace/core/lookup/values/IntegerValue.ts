/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { LookupContext } from "../context.ts";
import { QuantityValue, StringValue } from "../values.ts";
import { ClassOf, ConcreteValue, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents an integer (BigInt)
 */
export class IntegerValue extends ConcreteValue {
    readonly value: bigint;

    constructor(value: bigint | number) {
        super();
        this.value = BigInt(value);
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // An integer literal just looks like a plain integer, e.g. 5
        return String(this.value);
    }

    protected serialize() {
        // Unfortunately JavaScript cannot serialize BigInt to JSON numbers (even though JSON numbers can have
        // arbitrary digits), so we have to serialize it as a string.
        return { type: "Integer" as const, value: String(this.value) };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value !== 0n);
        } else if (newType === StringValue) {
            return new StringValue(this.value.toString());
        }
        return undefined;
    }

    protected override doCompareTo(otherValue: LookupValue): number {
        if (otherValue instanceof IntegerValue) {
            const diff = this.value - otherValue.value;
            return diff === 0n ? 0 : diff > 0n ? 1 : -1;
        } else if (otherValue instanceof QuantityValue) {
            return new QuantityValue(Number(this.value)).compareTo(otherValue);
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
