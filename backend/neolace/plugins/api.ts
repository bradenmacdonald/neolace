/** Public API that plugins can use */

export * as log from "std/log/mod.ts";
export * as api from "neolace/deps/neolace-api.ts";

export { config as realmConfig } from "neolace/app/config.ts";
export { getGraph } from "neolace/core/graph.ts";
export { NeolaceHttpResource } from "neolace/api/mod.ts";
export { checkPermissions, hasPermission, makeCypherCondition } from "neolace/core/permissions/check.ts";
export { Always, PermissionGrant } from "neolace/core/permissions/grant.ts";

export { Site, siteIdFromKey, siteKeyFromId } from "neolace/core/Site.ts";
export { Entry } from "neolace/core/entry/Entry.ts";
export { EntryType } from "neolace/core/schema/EntryType.ts";
export { getEntry } from "neolace/api/site/[siteKey]/entry/[entryId]/_helpers.ts";
export { GetEntryFlags } from "neolace/deps/neolace-api.ts";
export { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
export { entryToIndexDocument } from "neolace/core/entry/entry-to-index-doc.ts";

// Connections and actions:
export { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
export { getConnection } from "neolace/core/edit/connections.ts";

// Neolace lib functions
export { createRandomToken } from "neolace/lib/secure-token.ts";
