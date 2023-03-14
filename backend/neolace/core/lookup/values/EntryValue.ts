/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, VNID } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Site } from "neolace/core/Site.ts";
import { LookupContext } from "../context.ts";
import { ClassOf, ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { LazyEntrySetValue } from "./LazyEntrySetValue.ts";
import { StringValue } from "./StringValue.ts";
import { InlineMarkdownStringValue } from "./InlineMarkdownStringValue.ts";

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
        return `entry("${this.id}")`;
    }

    protected override doCastTo(newType: ClassOf<LookupValue>, context: LookupContext): LookupValue | undefined {
        if (newType === LazyEntrySetValue) {
            return new LazyEntrySetValue(
                context,
                C`
                    MATCH (entry:${Entry} {id: ${this.id}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
                    WITH entry, {} AS annotations
                `,
                { sourceExpression: undefined, sourceExpressionEntryId: undefined },
            );
        }
        return undefined;
    }

    protected serialize() {
        return { type: "Entry" as const, id: this.id };
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        if (attrName === "id") {
            return new StringValue(this.id);
        } else if (attrName === "name") {
            return new StringValue(
                (await context.tx.pullOne(Entry, (e) => e.name, { id: this.id })).name,
            );
        } else if (attrName === "description") {
            return new InlineMarkdownStringValue(
                (await context.tx.pullOne(Entry, (e) => e.description, { id: this.id })).description,
            );
        } else if (attrName === "key") {
            return new StringValue(
                (await context.tx.pullOne(Entry, (e) => e.key, { id: this.id })).key,
            );
        }
        return undefined;
    }
}
