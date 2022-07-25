import { VNID } from "neolace/deps/vertex-framework.ts";
import { ConcreteValue, IHasLiteralExpression } from "./base.ts";

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
}
