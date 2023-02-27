export * as SDK from "neolace-sdk";
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

/** Use this in URLs in lieu of an ID if there is no ID yet. It's neither a valid VNID nor key. */
export const NEW = "_";
export type NEW = typeof NEW;
