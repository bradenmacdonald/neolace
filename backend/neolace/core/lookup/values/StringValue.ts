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
import { IntegerValue } from "../values.ts";
import { ClassOf, ConcreteValue, ICountableValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A value that respresents a string
 */
export class StringValue extends ConcreteValue implements IHasLiteralExpression, ICountableValue {
    readonly value: string;
    readonly hasCount = true;

    constructor(value: string) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        // JSON.stringify() will create a "quoted" and \"escaped\" string for us.
        return JSON.stringify(this.value);
    }

    /**
     * Get a slice of the characters in this string.
     * This does NOT return a substring; it returns an array of single-character strings, because this is part of the
     * iterable interface, not a string-specific function.
     */
    public async getSlice(offset: bigint, numItems: bigint): Promise<LookupValue[]> {
        const slicedStr = this.value.slice(Number(offset), Number(offset + numItems));
        return slicedStr.split("").map((char) => new StringValue(char));
    }

    protected serialize() {
        return { type: "String" as const, value: this.value };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value.length !== 0);
        }
        return undefined;
    }

    public async getCount(): Promise<bigint> {
        return BigInt(this.value.length);
    }

    public override compareTo(otherValue: LookupValue) {
        if (otherValue instanceof StringValue) {
            return this.value.localeCompare(otherValue.value);
        }
        return super.compareTo(otherValue); // This will throw
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string): Promise<LookupValue | undefined> {
        if (attrName === "length") {
            return new IntegerValue(this.value.length);
        }
        return undefined;
    }
}
