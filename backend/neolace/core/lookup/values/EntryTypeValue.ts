import { EntryType } from "neolace/core/schema/EntryType.ts";
import { ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { LookupContext } from "../context.ts";
import { StringValue } from "./StringValue.ts";

/**
 * Represents an EntryType
 */
export class EntryTypeValue extends ConcreteValue implements IHasLiteralExpression {
    readonly key: string;

    constructor(key: string) {
        super();
        this.key = key;
    }

    /**
     * Return this value as a string, in Neolace Lookup Expression format.
     * This string should parse to an expression that yields the same value.
     */
    public override asLiteral(): string {
        return `entryType("${this.key}")`;
    }

    protected serialize() {
        return { type: "EntryType" as const, key: this.key };
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        if (attrName === "key") {
            return new StringValue(this.key);
        } else if (attrName === "name") {
            return new StringValue(
                (await context.tx.pullOne(EntryType, (et) => et.name, {
                    with: { siteNamespace: context.siteId, key: this.key },
                })).name,
            );
        }
        return undefined;
    }
}
