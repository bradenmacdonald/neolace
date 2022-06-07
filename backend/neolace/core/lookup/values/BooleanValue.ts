import type * as api from "neolace/deps/neolace-api.ts";
import { ConcreteValue } from "./base.ts";

/**
 * A value that respresents a boolean
 */
export class BooleanValue extends ConcreteValue {
    readonly value: boolean;

    constructor(value: boolean) {
        super();
        this.value = value;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return this.value ? "true" : "false";
    }

    protected serialize(): api.BooleanValue {
        return { type: "Boolean" as const, value: this.value };
    }
}
