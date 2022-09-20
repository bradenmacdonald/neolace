import { VNID } from "neolace/deps/vertex-framework.ts";

import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { ActionObject } from "neolace/core/permissions/action.ts";
import { getAllPerms, PermissionName } from "neolace/core/permissions/permissions.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { checkPermissions } from "../../../core/permissions/check.ts";

export class SiteUserMyPermissionsResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/my-permissions"];

    GET = this.method({
        responseSchema: api.SiteUserMyPermissionsSchema,
        description: "List my permissions",
        notes: "This lists all the permissions that the current user has on the current site, in a given context.",
    }, async ({ request }) => {
        // Permissions and parameters:

        const object: ActionObject = {};

        // Check what parameters were specified in the query string:
        for (const [key, value] of new URL(request.url).searchParams.entries()) {
            if (["entryId", "entryTypeId", "draftId"].includes(key)) {
                try {
                    object[key as keyof ActionObject] = VNID(value);
                } catch {
                    throw new api.InvalidFieldValue([{ fieldPath: key, message: "Not a valid VNID" }]);
                }
            } else if (key.startsWith("plugin:")) {
                object[key as `plugin:${string}`] = value;
            }
        }

        if (object.entryId !== undefined && object.entryTypeId === undefined) {
            // Compute entryTypeId automatically, if entryId is specified:
            const graph = await getGraph();
            const etData = await graph.pullOne(Entry, (e) => e.type((t) => t.id), { key: object.entryId });
            object.entryTypeId = etData.type?.id;
        }

        const result: Record<string, { hasPerm: boolean }> = {};

        const permsToCheck: PermissionName[] = [];
        for (const perm of await getAllPerms()) {
            // First, determine if we know enough data to check this permission.
            // For example, to check the "view.entry" permission, we need "entryId" and "entryTypeId". If we don't have
            // those object fields, we can't know if the user has permission or not, so we skip that permission.
            let hasRequiredObjectFields = true;
            for (const requiredObjectField of perm.requiresObjectFields) {
                if (!(requiredObjectField in object)) {
                    hasRequiredObjectFields = false;
                    break;
                }
            }
            if (!hasRequiredObjectFields) {
                // We don't have enough data to compute if the user has this permission or not.
                continue;
            }
            permsToCheck.push(perm.name);
        }
        const subject = await this.getPermissionSubject(request);
        // Now check which of those permissions the user has:
        console.time(`checkPermissions`);
        const permResults = await checkPermissions(subject, permsToCheck, object);
        console.timeEnd(`checkPermissions`);

        for (let i = 0; i < permsToCheck.length; i++) {
            const permName = permsToCheck[i];
            const hasPerm = permResults[i];
            result[permName] = { hasPerm };
        }
        return result;
    });
}
