/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { CorePerm, PropertyType } from "neolace/deps/neolace-sdk.ts";

import { Property } from "neolace/core/schema/Property.ts";
import { directRelTypeForPropertyType, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";

import { LookupExpression } from "../base.ts";
import { LazyEntrySetValue, LookupValue, PropertyValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";

/**
 * reverse([entry or entry set], prop=...)
 *
 * Get a all entries which have the specified entry/entries as a value for the specified property.
 *
 * e.g. if A has part B, then B.reverse(prop=[[has part]]) will yield A
 *
 * Only distinct entries will be returned, and information like rank, note, etc. will not be returned.
 */
export class ReverseProperty extends LookupFunctionWithArgs {
    static functionName = "reverse";

    /** An expression that specifies what entry(ies)' properties we want to reverse */
    public get fromEntriesExpr(): LookupExpression {
        return this.firstArg;
    }
    /** An expression that specifies what property we want to retrieve */
    public get propertyExpr(): LookupExpression {
        return this.otherArgs["prop"];
    }

    protected override validateArgs(): void {
        this.requireArgs(["prop"]);
    }

    public async getValue(context: LookupContext): Promise<LookupValue> {
        // TODO: if this.fromEntriesExpr is a Placeholder (X), return a special placeholder value.

        // First, look up the property we are retrieving:
        const propValue = await this.propertyExpr.getValueAs(PropertyValue, context);
        let propertyData;
        try {
            propertyData = await context.tx.queryOne(C`
                MATCH (prop:${Property} {siteNamespace: ${context.siteId}, key: ${propValue.key}})
            `.RETURN({ "prop.type": Field.String }));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new LookupEvaluationError(`Property "${propValue.key}" not found.`);
            }
            throw err;
        }
        const propType = propertyData["prop.type"] as PropertyType;
        if (propType !== PropertyType.RelIsA && propType !== PropertyType.RelOther) {
            throw new LookupEvaluationError("reverse() only works with relationship properties.");
        }

        const startingEntrySet = await this.fromEntriesExpr.getValueAs(LazyEntrySetValue, context);

        // Permissions check:
        const canViewEntry = await makeCypherCondition(
            context.subject,
            [
                // If A "has author" B, where "has author" is a property, then to reverse the "has author" from B to A
                // (show me all papers authored by B), the user needs permission to view A including view its properties
                // (in this case "view author").
                // We can assume that B (the argument to this reverse() function) is an entry the user has permission to
                // view so we only need to check A.
                CorePerm.viewEntry,
                CorePerm.viewEntryProperty,
            ],
            {},
            ["entry"],
        );

        // Find all the entries that are related via the specified property to the source entry/entries.
        return new LazyEntrySetValue(
            context,
            C`
            ${startingEntrySet.cypherQuery}

            WITH entry AS toEntry  // Continue the existing entry query, discard annotations if present

            // Get the property that we're looking for
            MATCH (prop:${Property} {siteNamespace: ${context.siteId}, key: ${propValue.key}})

            MATCH (fromEntry)-[directRel:${directRelTypeForPropertyType(propType)}]->(toEntry)
            // From the direct relationship, get the PropertyFact:
            MATCH (pf:PropertyFact {directRelNeo4jId: id(directRel)})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            // Then from the PropertyFact, get the fromEntry:
            MATCH (fromEntry:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf)

            // When reversing, we don't have to worry about inheritance.

            WITH fromEntry AS entry
            WHERE ${canViewEntry}

            WITH DISTINCT entry, {} AS annotations
        `,
            {
                orderByClause: C`ORDER BY entry.name, entry.id`,
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
