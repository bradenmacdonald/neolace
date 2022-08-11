import { VNID } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { LookupContext } from "../context.ts";
import { StringValue } from "./StringValue.ts";

/**
 * Represents an EntryType
 */
export class EntryTypeValue extends ConcreteValue implements IHasLiteralExpression {
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
        return `entryType("${this.id}")`;
    }

    protected serialize() {
        return { type: "EntryType" as const, id: this.id };
    }

    public override getSortString(): string {
        return this.id; // best we can do? Not very useful but at least it's stable.
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        if (attrName === "id") {
            return new StringValue(this.id);
        } else if (attrName === "name") {
            return new StringValue(
                (await context.tx.pullOne(EntryType, (et) => et.name, { key: this.id })).name,
            );
        }
        return undefined;
    }
}
