import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { PropertyMode, PropertyType } from "neolace/deps/neolace-api.ts";

import { Site } from "neolace/core/Site.ts";
import { Property } from "neolace/core/schema/Property.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { directRelTypeForPropertyType, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryProperty } from "neolace/core/entry/properties.ts";

import { LookupExpression } from "../base.ts";
import {
    EntryValue,
    InlineMarkdownStringValue,
    IntegerValue,
    LazyEntrySetValue,
    LookupValue,
    NullValue,
    PropertyValue,
    StringValue,
} from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { LookupContext } from "../../context.ts";
import { LookupFunctionWithArgs } from "./base.ts";
import { hasPermissions, makeCypherCondition } from "neolace/core/permissions/check.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { hasSourceExpression } from "../../values/base.ts";

/**
 * Helper function to read annotated rank values from a database query result
 */
export const dbRankToValue = (dbValue: unknown): IntegerValue | NullValue => {
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
export const dbNoteToValue = (dbValue: unknown): InlineMarkdownStringValue | undefined => {
    if (typeof dbValue === "string" && dbValue !== "") {
        return new InlineMarkdownStringValue(dbValue);
    }
    return undefined;
};

/**
 * Helper function to read annotated slot values from a database query result
 */
export const dbSlotToValue = (dbValue: unknown): StringValue | undefined => {
    if (dbValue === null) {
        // Slots are disabled for this property - return NULL
        return undefined;
    } else if (typeof dbValue === "string") {
        // Slots are enabled for this property - return a string, which may be empty
        return new StringValue(dbValue);
    } else {
        throw new LookupEvaluationError("Unexpected data type for 'slot' while evaluating lookup.");
    }
};

/**
 * get([entry or entry set], prop=...)
 *
 * Get a property value or set of property values.
 *
 * This function has slightly different behavior depending on how it's used:
 *
 * If used with a relationship property, it will return all entries found from
 * the values of the property for the given entries. Entries may appear multiple times.
 *
 * If used with a value property and a single entry
 *  e.g. this.get(prop=prop("_dateOfBirth"))
 * Then this will return either a single value (e.g. a date) or an iterable of values (if
 * multiple values are set for the same property on the same entry)
 *
 * If used with a value property and multiple entries,
 *  e.g. this.andAncestors().get(prop=prop("_dateOfBirth"))
 * Then this will always return an iterable of values
 */
export class GetProperty extends LookupFunctionWithArgs {
    static functionName = "get";

    /** An expression that specifies what entry(ies)' property we want to retrieve */
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
        // TODO: if this.fromEntriesExpr is a Transform Expression, return a special placeholder value?

        // First, look up the property we are retrieving:
        const propValue = await this.propertyExpr.getValueAs(PropertyValue, context);
        let propertyData;
        try {
            propertyData = await context.tx.queryOne(C`
                MATCH (prop:${Property} {id: ${propValue.id}})-[:${Property.rel.FOR_SITE}]->(:${Site} {id: ${context.siteId}})
            `.RETURN({ "prop.type": Field.String, "prop.mode": Field.String, "prop.default": Field.String }));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new LookupEvaluationError("Property not found / invalid property ID");
            }
            throw err;
        }
        const propType = propertyData["prop.type"] as PropertyType;
        const propMode = propertyData["prop.mode"] as PropertyMode;
        const propDefaultValue = propertyData["prop.default"];

        if (propMode === PropertyMode.Auto) {
            // This is an "auto" property, which means its value is determined by evaluating another lookup expression.
            // Are we retieving it for one entry or many?
            const forEntry = await (await this.fromEntriesExpr.getValue(context)).castTo(EntryValue, context);
            if (forEntry !== undefined) {
                // Yes, we are looking up this value for a single entry.
                // Does the user have permission?
                if (!await hasPermissions(context.subject, corePerm.viewEntryProperty.name, { entryId: forEntry.id })) {
                    throw new LookupEvaluationError("You do not have permission to view that property.");
                }
                // Compute the value of this auto property:
                const forEntryContext = context.getContextFor(forEntry.id);
                let value = await forEntryContext.evaluateExpr(propDefaultValue || "null");
                if (hasSourceExpression(value)) {
                    value = value.cloneWithSourceExpression(this, context.entryId);
                }
                return value;
            } else {
                // We are lookup up this value property for many entries.
                // To support this probably requires changing context.entryId to context.thisValue so that we can make
                // 'this' into an entry set, and not just a single entry, while we evaluate this.
                throw new LookupEvaluationError(
                    "Getting a property from multiple entries is not yet supported by get()",
                );
            }
        } else if (propType === PropertyType.RelIsA || propType === PropertyType.RelOther) {
            // This is a relationship property.
            const startingEntrySet = await this.fromEntriesExpr.getValueAs(LazyEntrySetValue, context);
            // Get the cypher clause/predicate that we can use to filter out entries that the user is not allowed to see.
            const canViewProperties = await makeCypherCondition(
                context.subject,
                corePerm.viewEntryProperty.name,
                {},
                ["entry"],
            );
            const canViewEntry = await makeCypherCondition(context.subject, corePerm.viewEntry.name, {}, ["entry"]);
            // Using a simplified version of our "get property value" code, we are finding all the entries that are
            // related via a specific property to the source entry/entries.
            return new LazyEntrySetValue(
                context,
                C`
                ${startingEntrySet.cypherQuery}

                // Make sure that the user has permission to view the properties of this entry:
                WITH entry WHERE ${canViewProperties}
                WITH entry AS fromEntry  // Continue the existing entry query, discard annotations if present

                // Get the property that we're looking for, and double-check it applies to this specific entry...
                MATCH (prop:${Property} {id: ${propValue.id}})-[:${Property.rel.APPLIES_TO_TYPE}]->(:${EntryType})<-[:${Entry.rel.IS_OF_TYPE}]-(fromEntry)

                // Fetch all propertyfacts associated with this specific property, on this entry or its ancestors
                MATCH path = (fromEntry)-[:${Entry.rel.IS_A}*0..50]->(ancestor:${Entry})-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)

                WITH fromEntry, prop, path, ancestor, pf
                    WHERE (length(path) = 2 OR prop.inheritable = true)
                    // If this is attached directly to this entry, the path length will be 2; it will be longer if it's from an ancestor

                // We use minDistance below so that for each inherited property, we only get the
                // values set by the closest ancestor. e.g. if grandparent->parent->child each
                // have birthDate, child's birthDate will take priority and grandparent/parent's won't be returned
                WITH fromEntry, prop, CASE WHEN prop.enableSlots THEN pf.slot ELSE null END AS slot, min(length(path)) AS minDistance, collect({pf: pf, ancestor: ancestor, distance: length(path)}) AS facts
                // Now filter to only have values from the closest ancestor:
                WITH fromEntry, prop, slot, minDistance, facts
                UNWIND facts as f
                WITH fromEntry, prop, slot, f WHERE f.distance = minDistance
                WITH fromEntry, slot, f.pf AS pf, f.distance AS distance, f.ancestor AS ancestor

                MATCH (fromEntry)-[directRel:${directRelTypeForPropertyType(propType)}]->(toEntry:${Entry})
                    WHERE id(directRel) = pf.directRelNeo4jId

                WITH toEntry AS entry, {note: pf.note, rank: pf.rank, slot: slot} AS annotations

                WITH entry, annotations
                WHERE ${canViewEntry}
                WITH entry, annotations
                ORDER BY annotations.rank, entry.name
            `,
                {
                    annotations: { rank: dbRankToValue, note: dbNoteToValue, slot: dbSlotToValue },
                    sourceExpression: this,
                    sourceExpressionEntryId: context.entryId,
                },
            );
        } else {
            // This is a value property. Are we retieving it for one entry or many?
            const forEntry = await (await this.fromEntriesExpr.getValue(context)).castTo(EntryValue, context);
            if (forEntry !== undefined) {
                // Yes, we are looking up this value for a single entry.

                // Does the user have permission?
                if (!await hasPermissions(context.subject, corePerm.viewEntryProperty.name, { entryId: forEntry.id })) {
                    throw new LookupEvaluationError("You do not have permission to view that property.");
                }

                // Get the values that are explicitly set on this entry
                const propFacts = (await getEntryProperty({
                    entryId: forEntry.id,
                    propertyId: propValue.id,
                    tx: context.tx,
                }))?.facts ?? [];

                // Return this single value
                if (propFacts.length) {
                    // The property is set.
                    if (propFacts.length === 1) {
                        // And it has a single value
                        const forEntryContext = context.getContextFor(forEntry.id);
                        return await forEntryContext.evaluateExpr(propFacts[0].valueExpression);
                        // TODO: ^ In this case, we should evaluate the expression without a transaction (support
                        // simple expressions only, not complex database lookups)
                    } else {
                        // And it has multiple values
                        throw new LookupEvaluationError("Multiple property values not yet supported for get()");
                    }
                } else if (propDefaultValue) {
                    // Return the default value.
                    const forEntryContext = context.getContextFor(forEntry.id);
                    return await forEntryContext.evaluateExpr(propDefaultValue);
                } else {
                    // Return null - the property is not set and has no default.
                    return new NullValue();
                }
            } else {
                // We are lookup up this value property for many entries.
                // const forEntrySet = await this.fromEntriesExpr.getValueAs(LazyEntrySetValue, context);
                throw new LookupEvaluationError(
                    "Getting a property from multiple entries is not yet supported by get()",
                );
            }
        }
    }
}
