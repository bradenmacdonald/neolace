import { getPlugins } from "neolace/plugins/loader.ts";
import { CorePerm, PermissionName } from "neolace/deps/neolace-api.ts";
export { type PermissionName } from "neolace/deps/neolace-api.ts";
import { ActionObject } from "./action.ts";

export interface Permission {
    name: PermissionName;
    description: string;
    /**
     * Additional prerequisite permissions that the user must have in order to have this permission.
     * For example, if "proposeEdits.entry" requires: [CorePerm.viewEntry], that means that users are not allowed to propose
     * edits to an entry unless they also have permission to view the entry, which makes sense.
     */
    requires?: PermissionName[];
    requiresObjectFields: (keyof ActionObject)[];
}

export function definePermissions<T extends { [key: string]: Permission }>(perms: T): T {
    return Object.freeze(perms);
}

export const corePerm = definePermissions({
    /** Built-in permissions that affect how Neolace works, which are scoped to a particular site: */
    viewSite: {
        name: CorePerm.viewSite,
        description: "View this site and its home page.",
        requiresObjectFields: [],
    },
    viewEntry: {
        name: CorePerm.viewEntry,
        description: "View the name, type, and ID of entries.",
        requires: [CorePerm.viewSite],
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    viewEntryDescription: {
        name: CorePerm.viewEntryDescription,
        description: "View the description of entries.",
        requires: [CorePerm.viewEntry],
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    viewEntryProperty: {
        name: CorePerm.viewEntryProperty,
        description: "View the properties of entries.",
        requires: [CorePerm.viewEntry],
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    viewEntryFeatures: {
        name: CorePerm.viewEntryFeatures,
        description: "View the article text, image, files, or other content features of entries.",
        requires: [CorePerm.viewEntry],
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    // TODO: permission to view change history of an entry
    // Schema //
    viewSchema: {
        name: CorePerm.viewSchema,
        description: `View this site's complete schema. This is required to list all the entry types and properties
            available on the site. This is not required just to see the definition of an entry type or property that
            is used on an entry that the user has permission to view.`,
        requires: [CorePerm.viewSite],
        requiresObjectFields: [],
    },
    proposeEditToEntry: {
        name: CorePerm.proposeEditToEntry,
        description: "Propose edits to an entry (by creating a draft)",
        requires: [
            CorePerm.viewEntry,
            CorePerm.viewEntryProperty,
            CorePerm.viewEntryFeatures,
            CorePerm.viewEntryDescription,
        ],
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    proposeNewEntry: {
        name: CorePerm.proposeNewEntry,
        description: "Create new entries (by creating a draft)",
        requiresObjectFields: [],
    },
    // TODO: more detailed edit permissions, e.g. user can edit properties but not ID.
    proposeEditToSchema: {
        name: CorePerm.proposeEditToSchema,
        description: "Can the user propose edits to the site's schema (by creating a draft)",
        requires: [CorePerm.viewSchema],
        requiresObjectFields: [],
    },
    applyEditsToEntries: {
        name: CorePerm.applyEditsToEntries,
        description: "Can the user approve/accept/apply edits to entries",
        requires: [CorePerm.viewEntry], // Does not necessarily require proposeEdits
        requiresObjectFields: ["entryId", "entryTypeKey"],
    },
    applyEditsToSchema: {
        name: CorePerm.applyEditsToSchema,
        description: "Can the user approve/accept/apply edits to the site's schema",
        requires: [CorePerm.viewSchema], // Does not necessarily require proposeEdits
        requiresObjectFields: [],
    },
    viewDraft: {
        name: CorePerm.viewDraft,
        description: "View drafts (proposed edits)",
        requires: [CorePerm.viewSite],
        requiresObjectFields: ["draftId"],
    },
    editDraft: {
        name: CorePerm.editDraft,
        description: "Edit drafts (change title/description/changes)",
        requires: [CorePerm.viewDraft],
        requiresObjectFields: ["draftId"],
    },

    // TODO in future: edit own user profile (and plugin to prevents 'members only' user from doing so)

    // Site Administration permissions:
    siteAdmin: {
        name: CorePerm.siteAdmin,
        description: "This is required for access to the site administration or any site administration functions.",
        requiresObjectFields: [],
    },
    siteAdminViewUser: {
        name: CorePerm.siteAdminViewUser,
        description: "View the site's users.",
        requires: [CorePerm.siteAdmin],
        requiresObjectFields: [],
    },
    siteAdminViewGroup: {
        name: CorePerm.siteAdminViewGroup,
        description: "View the site's groups and which users are in which group.",
        requires: [CorePerm.siteAdminViewUser],
        requiresObjectFields: [],
    },
    siteAdminManageGroup: {
        name: CorePerm.siteAdminManageGroup,
        description: "Edit the site's groups and their permissions.",
        requires: [CorePerm.siteAdminViewGroup],
        requiresObjectFields: [],
    },
    siteAdminManageGroupMembership: {
        name: CorePerm.siteAdminManageGroupMembership,
        description: "Add/remove users to groups. This is how they are added/removed from the site as a whole.",
        requires: [CorePerm.siteAdminManageGroup],
        requiresObjectFields: [],
    },

    /** Actions that can only take place from the home site: */
    createSite: {
        name: CorePerm.createSite,
        description: "Create a new site in this realm.",
        requiresObjectFields: [],
    },
});

export async function getPerm(name: PermissionName): Promise<Permission | undefined> {
    for (const p of Object.values(corePerm)) {
        if (p.name === name) {
            return p;
        }
    }
    const _plugins = await getPlugins();
    // TODO: check if plugins define any additional permissions
    return undefined;
}

export async function getAllPerms(): Promise<Permission[]> {
    const perms = Object.values(corePerm);
    //const _plugins = await getPlugins();
    // TODO: load defined permissions from plugins
    return perms;
}
