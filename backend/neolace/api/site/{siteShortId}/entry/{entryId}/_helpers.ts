import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import { ConcreteValue, ErrorValue, InlineMarkdownStringValue, StringValue } from "neolace/core/lookup/values.ts";
import { getEntryProperties } from "neolace/core/entry/properties.ts";
import { getEntryFeaturesData } from "neolace/core/entry/features/get-feature-data.ts";


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

    // As we extract the data about this entry, build a list of all the other entry IDs that we've seen, to populate the
    // "reference cache". The entry itself is also included.
    const entryIdsUsed = new Set<VNID>([entryData.id]);
    const friendlyIdsUsed = new Set<string>();

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
            extractLookupReferences(serializedValue, {entryIdsUsed});
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
                entryIdsUsed.add(prop.id);
            }
        }
    }

    if (flags.has(api.GetEntryFlags.IncludeFeatures)) {
        // Include "features" specific to this entry type. A common one is the "article" feature, which has prose text
        // (markdown). Another common one is the "Image" feature which means this entry is an image.
        result.features = await getEntryFeaturesData(entryData.id, {tx});
    }

    if (flags.has(api.GetEntryFlags.IncludeReferenceCache)) {

        if (result.features?.Article?.articleMD) {
            // Extract refernces from the description of this entry
            extractMarkdownReferences(entryData.description, {entryIdsUsed, friendlyIdsUsed});
            // Extract references from the article text:
            extractMarkdownReferences(result.features.Article.articleMD, {entryIdsUsed, friendlyIdsUsed});
        }

        result.referenceCache = {
            entryTypes: {},
            entries: {},
        };
        const entryReferences = await tx.pull(Entry,
            e => e.id.name.description.friendlyId().type(et => et.id.name.site(s => s.id)),
            {where: C`@this.id IN ${Array.from(entryIdsUsed)} OR @this.slugId IN ${Array.from(friendlyIdsUsed).map(friendlyId => siteCode + friendlyId)}`},
        );
        for (const reference of entryReferences) {
            // Let's just do a double-check that we're not leaking information from another site - shouldn't happen in any case:
            if (reference.type?.site?.id !== siteId) {
                throw new Error(`Error, found an Entry ID from another site altogether (${reference.id}). Security issue?`);
            }
            // Now add this reference and its entry type information to the cache
            result.referenceCache.entries[reference.id] = {
                id: reference.id,
                name: reference.name,
                friendlyId: reference.friendlyId,
                description: reference.description,
                entryType: {id: reference.type.id},
            };

            if (result.referenceCache.entryTypes[reference.type.id] === undefined) {
                result.referenceCache.entryTypes[reference.type.id] = {
                    id: reference.type.id,
                    name: reference.type.name,
                };
            }
        }
    }

    return result;
}

/**
 * Given a serialized "Lookup Value" that is the result of evaluating a Graph Lookup expression, find all unique entry
 * IDs that are present in the value (recursively). Adds to the set(s) passed as a parameter
 */
export function extractLookupReferences(value: api.AnyLookupValue, refs: {entryIdsUsed: Set<VNID>}) {
    switch (value.type) {
        case "List":
        case "Page": {
            value.values.forEach(v => extractLookupReferences(v, refs));
            return;
        }
        case "AnnotatedEntry":
        case "Entry": {
            refs.entryIdsUsed.add(value.id);
            return;
        }
        case "Integer":
        case "String":
        case "InlineMarkdownString":
        case "Error":
            return;
        default:
            // deno-lint-ignore no-explicit-any
            throw new Error(`Fix this: extractLookupReferences() doesn't yet support ${(value as any).type} values.`);
    }
}

/**
 * Given a markdown string (or optionally an abstract syntax tree [AST] if it's already parsed), find all unique entry
 * IDs that are mentioned.
 */
 export function extractMarkdownReferences(markdown: string|api.MDT.RootNode|api.MDT.Node, refs: {entryIdsUsed: Set<VNID>, friendlyIdsUsed: Set<string>}) {
    if (typeof markdown === "string") {
        markdown = api.MDT.tokenizeMDT(markdown);
    }

    const node = markdown;
    if (node.type === "link") {
        if (node.href.startsWith("/entry/")) {
            const entryKey = node.href.substr(7);
            // May be a friendlyId or VNID
            if (isVNID(entryKey)) {
                refs.entryIdsUsed.add(entryKey);
            } else {
                refs.friendlyIdsUsed.add(entryKey);
            }
        }
    }
    if ("children" in node) {
        for (const child of node.children) {
            extractMarkdownReferences(child, refs);
        }
    }
}
