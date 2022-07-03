import { getPlugins } from "neolace/plugins/loader.ts";

export type PermissionName = string;

export interface Permission {
    name: PermissionName;
    description: string;
    /**
     * Additional prerequisite permissions that the user must have in order to have this permission.
     * For example, if "proposeEdits.entry" requires: ["view.entry"], that means that users are not allowed to propose
     * edits to an entry unless they also have permission to view the entry, which makes sense.
     */
    requires?: PermissionName[];
}

export function definePermissions<T extends { [key: string]: Permission }>(perms: T): T {
    return Object.freeze(perms);
}

export const corePerm = definePermissions({
    /** Built-in permissions that affect how Neolace works, which are scoped to a particular site: */
    viewSite: { name: "view", description: "View this site and its home page." },
    viewEntry: { name: "view.entry", description: "View the name, type, and ID of entries.", requires: ["view"] },
    viewEntryDescription: {
        name: "view.entry.description",
        description: "View the description of entries.",
        requires: ["view.entry"],
    },
    viewEntryProperty: {
        name: "view.entry.property",
        description: "View the properties of entries.",
        requires: ["view.entry"],
    },
    viewEntryFeatures: {
        name: "view.entry.features",
        description: "View the article text, image, files, or other content features of entries.",
        requires: ["view.entry"],
    },
    // TODO: permission to view change history of an entry
    // Schema //
    viewSchema: {
        name: "view.schema",
        description: `View this site's complete schema. This is required to list all the entry types and properties
            available on the site. This is not required just to see the definition of an entry type or property that
            is used on an entry that the user has permission to view.`,
        requires: ["view"],
    },
    proposeEditToEntry: {
        name: "proposeEdits.entry",
        description: "Propose edits to entries (by creating a draft)",
        requires: ["view.entry", "view.entry.property", "view.entry.features", "view.entry.description"],
    },
    proposeNewEntry: {
        name: "proposeEdits.entry.new",
        description: "Create new entries (by creating a draft)",
        requires: ["proposeEdits.entry"],
    },
    // TODO: more detailed edit permissions, e.g. user can edit properties but not ID.
    proposeEditToSchema: {
        name: "proposeEdits.schema",
        description: "Can the user propose edits to the site's schema (by creating a draft)",
        requires: ["view.schema"],
    },
    applyEditsToEntries: {
        name: "applyEdits.entry",
        description: "Can the user approve/accept/apply edits to entries",
        requires: ["view.entry"], // Does not necessarily require proposeEdits
    },
    applyEditsToSchema: {
        name: "applyEdits.schema",
        description: "Can the user approve/accept/apply edits to the site's schema",
        requires: ["view.schema"], // Does not necessarily require proposeEdits
    },
    viewDraft: { name: "view.draft", description: "View drafts (proposed edits)", requires: ["view"] },
    editDraft: {
        name: "edit.draft",
        description: "Edit drafts (change title/description/changes)",
        requires: ["view.draft"],
    },

    // TODO in future: edit own user profile (and plugin to prevents 'members only' user from doing so)

    // TODO in future: site admin permissions: admin.view.users, admin.view.groups, admin. etc., erase all site content

    /** Actions that can only take place from the home site: */
    createSite: { name: "createSite", description: "Create a new site in this realm." },
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
