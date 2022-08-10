import { VNID } from "neolace/deps/vertex-framework.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { LookupContext } from "../context.ts";
import { ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { StringValue } from "./StringValue.ts";

/**
 * Represents a Property (like "Date of birth", NOT a property value like "1990-05-15")
 */
export class PropertyValue extends ConcreteValue implements IHasLiteralExpression {
    readonly id: VNID;

    constructor(id: VNID) {
        super();
        this.id = id;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `prop("${this.id}")`;
    }

    protected serialize() {
        return { type: "Property" as const, id: this.id };
    }

    public override getSortString(): string {
        return this.id; // not very useful but at least it's stable.
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        if (attrName === "id") {
            return new StringValue(this.id);
        } else if (attrName === "name") {
            return new StringValue(
                (await context.tx.pullOne(Property, (p) => p.name, { key: this.id })).name,
            );
        }
        return undefined;
    }
}
