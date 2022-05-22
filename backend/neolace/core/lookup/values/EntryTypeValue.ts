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
        return `[[/etype/${this.id}]]`; // e.g. [[/etype/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected serialize() {
        return { id: this.id };
    }
}
