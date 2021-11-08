import { api } from "neolace/api/mod.ts";
import { VNID, WrappedTransaction, isVNID, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import { ConcreteValue, ErrorValue, InlineMarkdownStringValue, StringValue } from "neolace/core/lookup/values.ts";
import { getEntryProperties } from "neolace/core/entry/properties.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";


/**
 * Helper function to wrap an async function so that it only runs at most once. If you don't need/call it, it won't run
 * at all.
 */
function computeOnceIfNeeded<ResultType>(doCompute: () => Promise<ResultType>): () => Promise<ResultType> {
    let resultPromise: Promise<ResultType>|undefined = undefined;
    return (): Promise<ResultType> => {
        if (resultPromise === undefined) {
            resultPromise = doCompute();
        }
        return resultPromise;
    };
}


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
        ancestors: undefined,
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

    // We'll need the ancestors of this entry in a couple different cases:
    const getAncestors = computeOnceIfNeeded(() => getEntryAncestors(entryData.id, tx));

    if (flags.has(api.GetEntryFlags.IncludeAncestors)) {
        // Include all ancestors. Not paginated but limited to 100 max.
        result.ancestors = await getAncestors();
    }

    if (flags.has(api.GetEntryFlags.IncludePropertiesSummary)) {
        // Include a summary of property values for this entry (up to 15 importance properties - whose importance is <= 20)
        const properties = await getEntryProperties(entryData.id, {tx, limit: 15, maxImportance: 20});
        const context: LookupContext = {tx, siteId, entryId: entryData.id, defaultPageSize: 5n};

        // ** In the near future, we'll need to resolve a dependency graph and compute these in parallel / async. **

        result.propertiesSummary = [];
        for (const prop of properties) {
            let value: ConcreteValue;
            try {
                value = await parseLookupString(prop.valueExpression).getValue(context).then(v => v.makeConcrete());
                if (prop.type === "PropertyValue" && prop.displayAs !== null) {
                    const valueAsString = value.castTo(StringValue, context);
                    if (valueAsString) {
                        value = new InlineMarkdownStringValue(prop.displayAs.replaceAll("{value}", valueAsString.value));
                    }
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
            refCache?.extractLookupReferences(serializedValue);
            if (prop.type === "SimplePropertyValue") {  // This 'if' is mostly to satisfy TypeScript
                result.propertiesSummary.push({
                    id: prop.id,
                    label: prop.label,
                    value: serializedValue,
                    importance: prop.importance,
                    note: prop.note,
                    type: prop.type,
                    source: prop.source,
                });
            } else {
                result.propertiesSummary.push({
                    id: prop.id,
                    label: prop.label,
                    value: serializedValue,
                    importance: prop.importance,
                    note: prop.note,
                    type: prop.type,
                    source: prop.source,
                });
                refCache?.addReferenceToEntryId(prop.id);
            }
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
