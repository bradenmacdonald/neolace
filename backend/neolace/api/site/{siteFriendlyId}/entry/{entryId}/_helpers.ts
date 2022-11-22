import { api } from "neolace/api/mod.ts";
import { C, EmptyResultError, isVNID, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import {
    AnnotatedValue,
    ConcreteValue,
    EntryValue,
    ErrorValue,
    InlineMarkdownStringValue,
    IntegerValue,
    PageValue,
    PropertyValue,
    StringValue,
} from "neolace/core/lookup/values.ts";
import { EntryPropertyValueSet, getEntryProperties, getRawProperties } from "neolace/core/entry/properties.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";
import { GetProperty, LiteralExpression } from "neolace/core/lookup/expressions.ts";
import { checkPermissions } from "neolace/core/permissions/check.ts";
import { hasSourceExpression } from "neolace/core/lookup/values/base.ts";

/**
 * Helper function to wrap an async function so that it only runs at most once. If you don't need/call it, it won't run
 * at all.
 */
// function computeOnceIfNeeded<ResultType>(doCompute: () => Promise<ResultType>): () => Promise<ResultType> {
//     let resultPromise: Promise<ResultType>|undefined = undefined;
//     return (): Promise<ResultType> => {
//         if (resultPromise === undefined) {
//             resultPromise = doCompute();
//         }
//         return resultPromise;
//     };
// }

/**
 * A helper function to get an entry
 */
export async function getEntry(
    vnidOrFriendlyId: VNID | string,
    siteId: VNID,
    /** This function will enforce permissions, only displaying as much as this user can see. */
    userId: VNID | undefined,
    tx: WrappedTransaction,
    flags: Set<api.GetEntryFlags> = new Set(),
): Promise<api.EntryData> {
    // If 'vnidOrFriendlyId' is a VNID, use it as-is; otherwise if it's a friendlyID we need to prepend the site prefix
    const where = isVNID(vnidOrFriendlyId)
        ? C`@this.id = ${vnidOrFriendlyId}`
        : C`@this.siteNamespace = ${siteId} AND @this.friendlyId = ${vnidOrFriendlyId}`;

    const entryData = await tx.pullOne(Entry, (e) =>
        e
            .id
            .name
            .description
            .friendlyId
            .type((et) => et.id.name.site((s) => s.id)), { where }).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new api.NotFound(`Entry with key "${vnidOrFriendlyId}" not found.`);
            } else {
                throw err;
            }
        });

    // Check permissions:
    const permSubject = { userId, siteId };
    const permObject = { entryId: entryData.id, entryTypeId: entryData.type?.id };
    const [
        canViewEntry,
        canViewDescription,
        canViewFeatures,
        canViewProperties,
    ] = await checkPermissions(permSubject, [
        api.CorePerm.viewEntry,
        api.CorePerm.viewEntryDescription,
        api.CorePerm.viewEntryFeatures,
        api.CorePerm.viewEntryProperty,
    ], permObject);
    if (!canViewEntry) {
        throw new api.NotAuthorized("You do not have permission to view that entry.");
    }

    // Remove the "site" field from the result
    const result: api.EntryData = {
        ...entryData,
        description: canViewDescription ? entryData.description : "",
        entryType: { id: entryData.type!.id, name: entryData.type!.name },
        propertiesSummary: undefined,
        referenceCache: undefined,
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    const refCache = flags.has(api.GetEntryFlags.IncludeReferenceCache) ? new ReferenceCache({ siteId }) : undefined;
    // We always include the current entry in the reference cache in case it references itself, to make it easy for API
    // consumers to show the right data (e.g. link tooltips) in that case.
    refCache?.addReferenceToEntryId(entryData.id);

    const maxValuesPerProp = 5;
    const lookupContext = new LookupContext({
        tx,
        siteId,
        userId,
        entryId: entryData.id,
        defaultPageSize: BigInt(maxValuesPerProp),
    });

    if (flags.has(api.GetEntryFlags.IncludePropertiesSummary) && canViewProperties) {
        // Include a summary of property values for this entry (up to 15 important properties - whose rank is <= 50)
        const properties = await getEntryProperties(entryData.id, { tx, limit: 15, maxRank: 50 });

        // ** In the near future, we'll need to resolve a dependency graph and compute these in parallel / async. **

        /** Helper function to return a single property value as an annotated lookup value */
        const factToValue = async (
            fact: EntryPropertyValueSet["facts"][0],
            prop: EntryPropertyValueSet["property"],
        ) => {
            const extraAnnotations: Record<string, unknown> = {};
            let innerValue = await lookupContext.evaluateExpr(fact.valueExpression);
            if (prop.displayAs) {
                // displayAs is used to format the value using Markdown, e.g. to convert it into a link
                // or display it in italics. But we still make the original value avaiable as an annotation.
                const innerValueAsString = (await innerValue.castTo(StringValue, lookupContext))?.value ||
                    "(error - cannot convert value to string)";
                extraAnnotations.plainValue = innerValue;
                innerValue = new InlineMarkdownStringValue(prop.displayAs.replaceAll("{value}", innerValueAsString));
            }
            if (hasSourceExpression(innerValue)) {
                // Override the source expression. We may have evaluated something like 'this.ancestors().count()' but
                // we want the source expression to be simply 'this.get(prop=prop(numberOfAncestors))'.
                // e.g. if users see "Author Bob has 50 books: a, b, c, more..." and they click the "more" link, we want
                // them to see the lookup query "Bob.get(prop=books)" not the actual query used
                // "Bob.reverse(prop=Author)", which is the "real" query used to evaluate "Bob.get(prop=books)" but is
                // harder to understand / more confusing.
                const sourceExpr = new GetProperty(
                    new LiteralExpression(new EntryValue(entryData.id)),
                    { prop: new LiteralExpression(new PropertyValue(prop.id)) },
                );
                innerValue = innerValue.cloneWithSourceExpression(sourceExpr, entryData.id);
            }
            if (fact.note) {
                extraAnnotations.note = new InlineMarkdownStringValue(fact.note);
            }
            if (fact.slot) {
                extraAnnotations.slot = new StringValue(fact.slot);
            }
            return new AnnotatedValue(await innerValue.makeConcrete(), {
                propertyFactId: new StringValue(fact.propertyFactId),
                source: new StringValue(fact.source.from === "ThisEntry" ? "ThisEntry" : "AncestorEntry"),
                rank: new IntegerValue(fact.rank),
                ...extraAnnotations,
            });
        };

        result.propertiesSummary = [];
        for (const { property, facts } of properties) {
            let value: ConcreteValue;
            try {
                if (facts.length === 0) {
                    if (property.default) {
                        let innerValue = await lookupContext.evaluateExpr(property.default);
                        if (hasSourceExpression(innerValue)) {
                            // Override the source expression. See explanation above.
                            const sourceExpr = new GetProperty(
                                new LiteralExpression(new EntryValue(entryData.id)),
                                { prop: new LiteralExpression(new PropertyValue(property.id)) },
                            );
                            innerValue = innerValue.cloneWithSourceExpression(sourceExpr, entryData.id);
                        }
                        value = new AnnotatedValue(await innerValue.makeConcrete(), {
                            source: new StringValue("Default"),
                        });
                    } else {
                        throw new Error("Unexpected property with no values and no default");
                    }
                } else if (facts.length === 1) {
                    value = await factToValue(facts[0], property);
                } else {
                    // There are two or more values. Show up to five.
                    value = new PageValue<AnnotatedValue>(
                        await Promise.all(facts.slice(0, maxValuesPerProp).map((f) => factToValue(f, property))),
                        {
                            startedAt: 0n,
                            pageSize: BigInt(maxValuesPerProp),
                            totalCount: BigInt(facts.length),
                            // Also pass along the lookup expression that can be used to retrieve the rest of the values
                            // from this property:
                            // this.get(prop=prop("_id"))
                            sourceExpression: new GetProperty(new LiteralExpression(new EntryValue(entryData.id)), {
                                prop: new LiteralExpression(new PropertyValue(property.id)),
                            }),
                            sourceExpressionEntryId: entryData.id,
                        },
                    );
                }
            } catch (err: unknown) {
                if (err instanceof LookupError) {
                    value = new ErrorValue(err);
                } else {
                    throw err;
                }
            }
            const serializedValue = value.toJSON();
            if (serializedValue.type === "Page" && serializedValue.values.length === 0) {
                // This property value is just an empty result set. Hide it from the result.
                continue;
            }
            result.propertiesSummary.push({
                propertyId: property.id,
                value: serializedValue,
            });
            refCache?.addReferenceToPropertyId(property.id);
            refCache?.extractLookupReferences(serializedValue, { currentEntryId: entryData.id });
        }
    }

    if (flags.has(api.GetEntryFlags.IncludeRawProperties) && canViewProperties) {
        // Include a complete list of all property values directly set on this entry
        result.propertiesRaw = await getRawProperties({ tx, entryId: entryData.id });
    }

    if (flags.has(api.GetEntryFlags.IncludeFeatures) && canViewFeatures) {
        // Include "features" specific to this entry type. A common one is the "article" feature, which has prose text
        // (markdown). Another common one is the "Image" feature which means this entry is an image.
        result.features = await getEntryFeaturesData(entryData.id, { tx, refCache });
    }

    if (flags.has(api.GetEntryFlags.IncludeReferenceCache)) {
        // Extract references from the description of this entry
        if (canViewDescription) {
            refCache?.extractMarkdownReferences(entryData.description, { currentEntryId: entryData.id, inline: true });
        }
        result.referenceCache = await refCache!.getData(lookupContext);
    }

    return result;
}
