import { C, VNID } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";
import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { LazyEntrySetValue } from "./LazyEntrySetValue.ts";

/**
 * Represents an Entry
 */
export class EntryValue extends ConcreteValue implements IHasLiteralExpression {
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
        return `[[/entry/${this.id}]]`; // e.g. [[/entry/_6FisU5zxXggLcDz4Kb3Wmd]]
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, context: LookupContext): LookupValue | undefined {
        if (newType === LazyEntrySetValue) {
            return new LazyEntrySetValue(
                context,
                C`
                MATCH (entry:${Entry} {id: ${this.id}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
                WITH entry, {} AS annotations
            `,
            );
        }
        return undefined;
    }

    protected serialize() {
        return { id: this.id };
    }
}
