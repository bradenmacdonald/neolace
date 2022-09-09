export * as api from "neolace-api";
export {
    client,
} from "./api-client";
export * from "lib/api-data/DraftData";
export * from "lib/api-data/Entry";
export * from "lib/api-data/EditableEntry";
export * from "lib/api-data/LoookupExpression";
export * from "lib/api-data/Permissions";
export * from "lib/api-data/Schema";
export * from "lib/api-data/SiteData";
export * from "lib/api-data/User";

/** Use this in URLs in lieu of an ID if there is no ID yet. It's neither a valid VNID nor friendlyId. */
export const NEW = "_";
export type NEW = typeof NEW;

// /**
//  * In this context, a "reference cache" is available to provide data on any Entry, Entry Type, or Property that is
//  * referenced. For example, in the context of an Entry A that links to Entry B, the reference cache will include some
//  * details about Entry B such as its Name and friendly ID, so that the link to it can be properly displayed within Entry
//  * A.
//  */
//  export const RefCacheContext = React.createContext<{refCache?: api.ReferenceCacheData, parentRefCache?: api.ReferenceCacheData}>({
//     // Default values for this context:
//     refCache: undefined,
// });

// /**
//  * In this context, there is a "current entry ID". e.g. on an entry page, this is the ID of the entry being viewed.
//  */
// export const EntryContext = React.createContext<{entryId: VNID|undefined}>({
//     // Default values for this context:
//     entryId: undefined,
// });


// TODO: a useRefCache() hook that uses the RefCacheContext plus applies any edits from the draft to the reference
// cache.
