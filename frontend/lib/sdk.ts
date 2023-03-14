/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
