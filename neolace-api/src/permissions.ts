/** One of the core permissions built in to Neolace */
export enum CorePerm {
    /** View this site and its home page. */
    viewSite = "view",
    /** View the name, type, and ID of entries. */
    viewEntry = "view.entry",
    /** View the description of entries. */
    viewEntryDescription = "view.entry.description",
    /** View the properties of entries. */
    viewEntryProperty = "view.entry.property",
    /** View the article text, image, files, or other content features of entries. */
    viewEntryFeatures = "view.entry.features",
    /** View this site's complete schema. This is required to list all the entry types and properties */
    viewSchema = "view.schema",
    /** Propose edits to an entry (by creating a draft) */
    proposeEditToEntry = "proposeEdits.entry",
    /** Create new entries (by creating a draft) */
    proposeNewEntry = "proposeEdits.entry.new",
    /** Can the user propose edits to the site's schema (by creating a draft) */
    proposeEditToSchema = "proposeEdits.schema",
    /** Can the user approve/accept/apply edits to entries */
    applyEditsToEntries = "applyEdits.entry",
    /** Can the user approve/accept/apply edits to the site's schema */
    applyEditsToSchema = "applyEdits.schema",
    /** View drafts (proposed edits) */
    viewDraft = "view.draft",
    /** Edit drafts (change title/description/changes) */
    editDraft = "edit.draft",
    /** This is required for access to the site administration or any site administration functions. */
    siteAdmin = "admin.view",
    /** View the site's users. */
    siteAdminViewUser = "admin.view.user",
    /** View the site's groups and which users are in which group. */
    siteAdminViewGroup = "admin.view.group",
    /** Edit the site's groups and their permissions. */
    siteAdminManageGroup = "admin.manage.group",
    /** Add/remove users to groups. This is how they are added/removed from the site as a whole. */
    siteAdminManageGroupMembership = "admin.manage.groupMembership",
    /** Create a new site in this realm. */
    createSite = "createSite",
}

export type PermissionName = CorePerm | `plugin:${string}`;
