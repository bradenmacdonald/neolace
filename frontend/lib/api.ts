export * as api from "neolace-api";
export {
    client,
} from "./api-client";
export * from "lib/api-data/DraftData";
export * from "lib/api-data/Entry";
export * from "lib/api-data/EditableEntry";
export * from "lib/api-data/LoookupExpression";
export * from "lib/api-data/Permissions";
export * from "lib/api-data/ReferenceCache";
export * from "lib/api-data/Schema";
export * from "lib/api-data/SiteData";
export * from "lib/api-data/User";

/** Use this in URLs in lieu of an ID if there is no ID yet. It's neither a valid VNID nor friendlyId. */
export const NEW = "_";
export type NEW = typeof NEW;

// /**
//  * In this context, there is a "current entry ID". e.g. on an entry page, this is the ID of the entry being viewed.
//  */
// export const EntryContext = React.createContext<{entryId: VNID|undefined}>({
//     // Default values for this context:
//     entryId: undefined,
// });
