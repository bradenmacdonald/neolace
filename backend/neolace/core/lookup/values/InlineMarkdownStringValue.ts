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
 * A value that respresents an inline markdown string
 *
 * Inline means it can only do basic formatting like links or bold/italicized text; it cannot do block elements.
 */
export class InlineMarkdownStringValue extends ConcreteValue implements IHasLiteralExpression {
    readonly value: string;

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
        return `markdown(${JSON.stringify(this.value)})`;
    }

    protected serialize() {
        return { type: "InlineMarkdownString" as const, value: this.value };
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, _context: LookupContext): LookupValue | undefined {
        if (newType === BooleanValue) {
            return new BooleanValue(this.value.length !== 0);
        }
        return undefined;
    }

    public override compareTo(otherValue: LookupValue): number {
        if (otherValue instanceof InlineMarkdownStringValue) {
            return this.value.localeCompare(otherValue.value);
        }
        return super.compareTo(otherValue); // This will throw
    }
}
