import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";

import { Site } from "neolace/core/Site.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { directRelTypeForPropertyType, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

import { LookupExpression } from "../expression.ts";
import {
    InlineMarkdownStringValue,
    IntegerValue,
    LazyEntrySetValue,
    LookupValue,
    NullValue,
    PropertyValue,
    StringValue,
} from "../values.ts";
import { LookupEvaluationError } from "../errors.ts";
import { LookupContext } from "../context.ts";

/**
 * Helper function to read annotated rank values from a database query result
 */
const dbRankToValue = (dbValue: unknown): IntegerValue | NullValue => {
    if (typeof dbValue === "bigint") {
        return new IntegerValue(dbValue);
    } else if (dbValue === null) {
        return new NullValue();
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'rank' while evaluating lookup.");
    }
};

/**
 * Helper function to read annotated note (markdown string) values from a database query result
 */
const dbNoteToValue = (dbValue: unknown): InlineMarkdownStringValue | NullValue => {
    if (typeof dbValue === "string") {
        return new InlineMarkdownStringValue(dbValue);
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'note' while evaluating lookup.");
    }
};

/**
 * Helper function to read annotated slot values from a database query result
 */
const dbSlotToValue = (dbValue: unknown): StringValue | NullValue => {
    if (dbValue === null) {
        // Slots are disabled for this property - return NULL
        return new NullValue();
    } else if (typeof dbValue === "string") {
        // Slots are enabled for this property - return a string, which may be empty
        return new StringValue(dbValue);
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'slot' while evaluating lookup.");
    }
};

/**
 * reverse([entry or entry set], prop=...)
 *
 * Get a all entries which have the specified entry/entries as a value for the specified property.
 *
 * e.g. if A has part B, then B.reverse(prop=[[has part]]) will yield A
 *
 * Returned entries are not necessarily distinct.
 */
export class ReverseProperty extends LookupExpression {
    // An expression that specifies what entry(ies)' property we want to reverse
    readonly fromEntriesExpr: LookupExpression;
    readonly propertyExpr: LookupExpression;

    constructor(fromEntriesExpr: LookupExpression, extraParams: { propertyExpr: LookupExpression }) {
        super();
        this.fromEntriesExpr = fromEntriesExpr;
        this.propertyExpr = extraParams.propertyExpr;
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
            ORDER BY annotations.rank, entry.name
        `,
            {
                annotations: { rank: dbRankToValue, note: dbNoteToValue, slot: dbSlotToValue },
                sourceExpression: this,
                sourceExpressionEntryId: context.entryId,
            },
        );
    }

    public toString(): string {
        return `reverse(${this.fromEntriesExpr.toString()}, prop=${this.propertyExpr.toString()})`;
    }
}
