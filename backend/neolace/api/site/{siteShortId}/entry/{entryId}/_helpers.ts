import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { ComputedFact } from "neolace/core/entry/ComputedFact.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { LookupError } from "neolace/core/lookup/errors.ts";
import { ErrorValue } from "neolace/core/lookup/values.ts";


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
    const key = isVNID(vnidOrFriendlyId) ? vnidOrFriendlyId : (await siteCodeForSite(siteId)) + vnidOrFriendlyId;

    const entryData = await tx.pullOne(Entry, e => e
        .id
        .name
        .description
        .friendlyId()
        .type(et => et.id.name.contentType.site(s => s.id)),
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
        entryType: {id: entryData.type!.id, name: entryData.type!.name, contentType: entryData.type!.contentType as api.ContentType},
        ancestors: undefined,
        computedFactsSummary: undefined,
        referenceCache: undefined,
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    // As we extract the data about this entry, build a list of all the other entry IDs that we've seen, to populate the
    // "reference cache". The entry itself is also included.
    const entryIdsUsed = new Set<VNID>([entryData.id]);

    // We'll need the ancestors of this entry in a couple different cases:
    const getAncestors = computeOnceIfNeeded(() => getEntryAncestors(entryData.id, tx));

    if (flags.has(api.GetEntryFlags.IncludeAncestors)) {
        // Include all ancestors. Not paginated but limited to 100 max.
        result.ancestors = await getAncestors();
    }

    if (flags.has(api.GetEntryFlags.IncludeComputedFactsSummary)) {
        // Include a summary of computed facts for this entry (up to 20 computed facts, with importance < 20)
        const factsToCompute = await getComputedFacts(entryData.id, {tx, summaryOnly: true, limit: 20});
        const context: LookupContext = {tx, siteId, entryId: entryData.id, defaultPageSize: 5n};

        // ** In the near future, we'll need to resolve a dependency graph and compute these in parallel / async. **

        result.computedFactsSummary = [];
        for (const cf of factsToCompute) {
            let value;
            try {
                value = await parseLookupString(cf.expression).getValue(context).then(v => v.makeConcrete());
            } catch (err: unknown) {
                if (err instanceof LookupError) {
                    value = new ErrorValue(err);
                } else {
                    throw err;
                }
            }
            const serializedValue = value.toJSON();
            extractReferences(serializedValue, {entryIdsUsed});
            result.computedFactsSummary.push({
                id: cf.id,
                label: cf.label,
                value: serializedValue,
            });
        }
    }

    if (flags.has(api.GetEntryFlags.IncludeReferenceCache)) {
        result.referenceCache = {
            entryTypes: {},
            entries: {},
        };
        const entryReferences = await tx.pull(Entry,
            e => e.id.name.description.friendlyId().type(et => et.id.name.site(s => s.id)),
            {where: C`@this.id IN ${Array.from(entryIdsUsed)}`},
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

async function getComputedFacts(entryId: VNID, options: {tx: WrappedTransaction, summaryOnly: boolean, skip?: number, limit?: number}): Promise<api.ComputedFactData[]> {

    // Neo4j doesn't allow normal query variables to be used for skip/limit so we have to carefully ensure these values
    // are safe (are just plain numbers) then format them for interpolation in the query string as part of the cypher
    // expression (not as variables)
    const skipSafe = C(String(Number(options.skip ?? 0)));
    const limitSafe = C(String(Number(Number(options.limit ?? 100))));

    // We can't use virtual props here because there's no way to limit/paginate them at the moment
    const facts = await options.tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})
        MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.HAS_COMPUTED_FACT}]->(cf:${ComputedFact})
        ${options.summaryOnly ? C`WHERE cf.importance <= 20` : C``}
        RETURN cf.id AS id, cf.label AS label, cf.expression AS expression, cf.importance AS importance
        ORDER BY cf.importance, cf.label  // This should match ComputedFact.defaultOrderBy
        SKIP ${skipSafe} LIMIT ${limitSafe}
    `.givesShape({
        id: Field.VNID,
        label: Field.String,
        expression: Field.String,
        importance: Field.Int,
    }));

    return facts;
}

/**
 * Given a serialized "Lookup Value" that is the result of evaluating a Graph Lookup expression, find all unique entry
 * IDs that are present in the value (recursively). Adds to the set(s) passed as a parameter
 */
export function extractReferences(value: api.AnyLookupValue, refs: {entryIdsUsed?: Set<VNID>}) {
    switch (value.type) {
        case "Page": {
            value.values.forEach(v => extractReferences(v, refs));
            return;
        }
        case "AnnotatedEntry":
        case "Entry": {
            refs.entryIdsUsed?.add(value.id);
            return;
        }
        case "Integer":
        case "Error":
            return;
        default:
            // deno-lint-ignore no-explicit-any
            throw new Error(`Fix this: extractReferences() doesn't yet support ${(value as any).type} values.`);
    }
}
