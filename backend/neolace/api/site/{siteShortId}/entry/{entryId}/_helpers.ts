import { api } from "neolace/api/mod.ts";
import { VNID, WrappedTransaction, isVNID, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";


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
        type: {id: entryData.type!.id, name: entryData.type!.name, contentType: entryData.type!.contentType as api.ContentType},
        ancestors: undefined,
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    // We'll need the ancestors of this entry in a couple different cases:
    const getAncestors = computeOnceIfNeeded(() => getEntryAncestors(entryData.id, tx));

    if (flags.has(api.GetEntryFlags.IncludeAncestors)) {
        // Include all ancestors. Not paginated but limited to 100 max.
        result.ancestors = await getAncestors();
    }



    return result;
}
