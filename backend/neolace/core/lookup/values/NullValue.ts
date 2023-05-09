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
import { ClassOf, ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { BooleanValue } from "./BooleanValue.ts";

/**
 * A null value
 */
export class NullValue extends ConcreteValue implements IHasLiteralExpression {
    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return "null";
    }

    protected serialize() {
        return { type: "Null" as const };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(false);
        }
        return undefined;
    }

    protected override doCompareTo(otherValue: LookupValue): number {
        if (otherValue instanceof NullValue) {
            return 0; // Should we make null not equal to null?
        }
        return super.doCompareTo(otherValue); // This will throw
    }
}
