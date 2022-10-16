import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { CorePerm, PropertyType } from "neolace/deps/neolace-api.ts";

import { Site } from "neolace/core/Site.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { directRelTypeForPropertyType, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";

import { LookupExpression } from "../base.ts";
import { LazyEntrySetValue, LookupValue, PropertyValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { dbNoteToValue, dbRankToValue, dbSlotToValue } from "./get.ts";

/**
 * reverse([entry or entry set], prop=...)
 *
 * Get a all entries which have the specified entry/entries as a value for the specified property.
 *
 * e.g. if A has part B, then B.reverse(prop=[[has part]]) will yield A
 *
 * Returned entries are not necessarily distinct.
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
                MATCH (prop:${Property} {id: ${propValue.id}})-[:${Property.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
            `.RETURN({ "prop.type": Field.String }));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new LookupEvaluationError("Property not found / invalid property ID");
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
            MATCH (prop:${Property} {id: ${propValue.id}})

            MATCH (fromEntry)-[directRel:${directRelTypeForPropertyType(propType)}]->(toEntry)
            // From the direct relationship, get the PropertyFact:
            MATCH (pf:PropertyFact {directRelNeo4jId: id(directRel)})-[:${PropertyFact.rel.FOR_PROP}]->(prop)
            // Then from the PropertyFact, get the fromEntry:
            MATCH (fromEntry:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf)

            // When reversing, we don't have to worry about inheritance.

            WITH fromEntry AS entry, {
                note: pf.note,
                rank: pf.rank,
                slot: CASE WHEN prop.enableSlots THEN pf.slot ELSE null END
            } AS annotations

            WITH entry, annotations
            WHERE ${canViewEntry}
            WITH entry, annotations
            ORDER BY annotations.rank, entry.name, entry.id
        `,
            {
                annotations: { rank: dbRankToValue, note: dbNoteToValue, slot: dbSlotToValue },
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }
}
