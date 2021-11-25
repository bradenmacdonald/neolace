import { api } from "neolace/api/mod.ts";
import { VNID, WrappedTransaction, isVNID, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import { AnnotatedValue, ConcreteValue, ErrorValue, InlineMarkdownStringValue, IntegerValue, NullValue, PageValue, StringValue } from "neolace/core/lookup/values.ts";
import { EntryPropertyValueSet, getEntryProperties } from "neolace/core/entry/properties.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";


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
export async function getEntry(vnidOrFriendlyId: VNID|string, siteId: VNID, tx: WrappedTransaction, flags: Set<api.GetEntryFlags> = new Set()): Promise<api.EntryData> {

    // If 'vnidOrFriendlyId' is a VNID, use it as-is; otherwise if it's a friendlyID we need to prepend the site prefix
    const siteCode = await siteCodeForSite(siteId);
    const key = isVNID(vnidOrFriendlyId) ? vnidOrFriendlyId : siteCode + vnidOrFriendlyId;

    const entryData = await tx.pullOne(Entry, e => e
        .id
        .name
        .description
        .friendlyId()
        .type(et => et.id.name.site(s => s.id)),
        {key, }
    ).catch((err) => {
        if (err instanceof EmptyResultError) {
            throw new api.NotFound(`Entry with key "${vnidOrFriendlyId}" not found.`);
        } else {
            throw err;
        }
    });

    // Remove the "site" field from the result
    const result: api.EntryData = {
        ...entryData,
        entryType: {id: entryData.type!.id, name: entryData.type!.name},
        propertiesSummary: undefined,
        referenceCache: undefined,
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    const refCache = flags.has(api.GetEntryFlags.IncludeReferenceCache) ? new ReferenceCache({siteId}) : undefined;
    // We always include the current entry in the reference cache in case it references itself, to make it easy for API
    // consumers to show the right data (e.g. link tooltips) in that case.
    refCache?.addReferenceToEntryId(entryData.id);

    if (flags.has(api.GetEntryFlags.IncludePropertiesSummary)) {
        // Include a summary of property values for this entry (up to 15 importance properties - whose importance is <= 20)
        const properties = await getEntryProperties(entryData.id, {tx, limit: 15, maxImportance: 20});
        const maxValuesPerProp = 5;
        const context: LookupContext = {tx, siteId, entryId: entryData.id, defaultPageSize: BigInt(maxValuesPerProp)};

        // ** In the near future, we'll need to resolve a dependency graph and compute these in parallel / async. **

        /** Helper function to return a single property value as an annotated lookup value */
        const factToValue = async (fact: EntryPropertyValueSet["facts"][0], prop: EntryPropertyValueSet["property"]) => {
            let innerValue;
            const extraAnnotations: Record<string, unknown> = {};
            try {
                innerValue = await parseLookupString(fact.valueExpression).getValue(context).then(v => v.makeConcrete());
                if (prop.displayAs) {
                    // displayAs is used to format the value using Markdown, e.g. to convert it into a link
                    // or display it in italics. But we still make the original value avaiable as an annotation.
                    const innerValueAsString = innerValue.castTo(StringValue, context)?.value || "(error - cannot convert value to string)";
                    extraAnnotations.plainValue = innerValue;
                    innerValue = new InlineMarkdownStringValue(prop.displayAs.replaceAll("{value}", innerValueAsString));
                }
            } catch (err: unknown) {
                if (err instanceof LookupError) {
                    innerValue = new ErrorValue(err);
                } else {
                    throw err;
                }
            }
            return new AnnotatedValue(innerValue, {
                source: new StringValue(fact.source.from === "ThisEntry" ? "ThisEntry" : "AncestorEntry"),
                note: new InlineMarkdownStringValue(fact.note),
                rank: new IntegerValue(fact.rank),
                slot: fact.slot ? new StringValue(fact.slot) : new NullValue(),
                ...extraAnnotations,
            });
        };

        result.propertiesSummary = [];
        for (const {property, facts} of properties) {
            let value: ConcreteValue;
            try {
                if (facts.length === 0) {
                    if (property.default) {
                        const innerValue = await parseLookupString(property.default).getValue(context).then(v => v.makeConcrete());
                        value = new AnnotatedValue(innerValue, {source: new StringValue("Default")});
                    } else {
                        throw new Error("Unexpected property with no values and no default");
                    }
                } else if (facts.length === 1) {
                    value = await factToValue(facts[0], property);
                } else {
                    // There are two or more values. Show up to five.
                    value = new PageValue<AnnotatedValue>(
                        await Promise.all(facts.slice(0, maxValuesPerProp).map(f => factToValue(f, property))),
                        {startedAt: 0n, pageSize: BigInt(maxValuesPerProp), totalCount: BigInt(facts.length)},
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
            if (
                (serializedValue.type === "Page" && serializedValue.values.length === 0)
                || (
                    serializedValue.type === "Annotated" && serializedValue.value.type === "Page"
                    && serializedValue.value.values.length === 0
                )
            ) {
                // This property value is just an empty result set. Hide it from the result.
                continue;
            }
            result.propertiesSummary.push({
                propertyId: property.id,
                value: serializedValue,
            });
            refCache?.addReferenceToPropertyId(property.id);
            refCache?.extractLookupReferences(serializedValue);
        }
    }

    if (flags.has(api.GetEntryFlags.IncludeFeatures)) {
        // Include "features" specific to this entry type. A common one is the "article" feature, which has prose text
        // (markdown). Another common one is the "Image" feature which means this entry is an image.
        result.features = await getEntryFeaturesData(entryData.id, {tx});

        if (result.features.Article?.articleMD) {
            // Extract references from the article text:
            refCache?.extractMarkdownReferences(result.features.Article.articleMD);
        }
    }

    if (flags.has(api.GetEntryFlags.IncludeReferenceCache)) {
        // Extract references from the description of this entry
        refCache?.extractMarkdownReferences(entryData.description);
        result.referenceCache = await refCache!.getData(tx);
    }

    return result;
}
