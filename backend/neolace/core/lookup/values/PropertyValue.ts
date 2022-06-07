import { VNID } from "neolace/deps/vertex-framework.ts";
import { ConcreteValue, IHasLiteralExpression } from "./base.ts";

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
        return `[[/prop/${this.id}]]`; // e.g. [[/prop/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected serialize() {
        return { type: "Property" as const, id: this.id };
    }
}
