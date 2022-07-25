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

    public override getSortString(): string {
        return this.value;
    }
}
