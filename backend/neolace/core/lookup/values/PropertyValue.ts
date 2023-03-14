/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Property } from "neolace/core/schema/Property.ts";
import { LookupContext } from "../context.ts";
import { ConcreteValue, IHasLiteralExpression, LookupValue } from "./base.ts";
import { StringValue } from "./StringValue.ts";

/**
 * Represents a Property (like "Date of birth", NOT a property value like "1990-05-15")
 */
export class PropertyValue extends ConcreteValue implements IHasLiteralExpression {
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
        return `prop("${this.key}")`;
    }

    protected serialize() {
        return { type: "Property" as const, key: this.key };
    }

    /** Get an attribute of this value, if any, e.g. value.name or value.length */
    public override async getAttribute(attrName: string, context: LookupContext): Promise<LookupValue | undefined> {
        if (attrName === "key") {
            return new StringValue(this.key);
        } else if (attrName === "name") {
            return new StringValue(
                (await context.tx.pullOne(Property, (p) => p.name, {
                    with: { siteNamespace: context.siteId, key: this.key },
                })).name,
            );
        }
        return undefined;
    }
}
