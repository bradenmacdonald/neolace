/**
 * Permissions checking code.
 *
 * Neolace uses a flexible permissions system built around Checks, Groups, and Grants.
 *
 * A Check is a function that determines whether or not a given user meets some criteria. For example,
 * CheckUserIsLoggedIn checks if the user is logged in and returns true if so or false otherwise. Checks can be built up
 * of other checks by combining them with the AllOf(check1, check2) [AND] function or the OneOf(check1, check2) [OR]
 * function.
 *
 * Users can be assigned to "Groups", and groups can be granted additional authorization Grants. If a user belongs to a
 * group with the "approveSchemaChanges" Grant, for example, then the user is authorized to approve schema changes.
 */
import { C, Field, SYSTEM_VNID, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Group, GroupMaxDepth, PermissionGrant } from "neolace/core/Group.ts";
import { AccessMode, Site } from "neolace/core/Site.ts";
import { BotUser, User } from "neolace/core/User.ts";

export interface CheckContext {
    tx: WrappedTransaction;
    userId?: VNID; // undefined if no user is logged in, otherwise the ID of the current authenticated user/bot.
    siteId?: VNID; // VNID of the current site, if applicable. Leave undefined for actions outside of any site, like creating a new site.
}

export type CheckResult = boolean;

export interface Check {
    (context: CheckContext): CheckResult | Promise<CheckResult>;
}

/**
 * An OR check, will return true if any of the given checks are true.
 * @param checks One or more checks to evaluate
 * @returns true or false
 */
export const OneOf = (...checks: Check[]): Check => {
    return async (context: CheckContext) => {
        for (const check of checks) {
            const result: CheckResult = await check(context);
            if (result === true) {
                return true;
            }
        }
        return false;
    };
};

/**
 * An AND check, will return true if and only if all of the given checks are true.
 * @param checks One or more checks to evaluate
 * @returns true or false
 */
export const AllOf = (...checks: Check[]): Check => {
    if (checks.length === 0) {
        throw new Error("Don't use AllOf() with no arguments.");
    }
    return async (context: CheckContext) => {
        for (const check of checks) {
            const result: CheckResult = await check(context);
            if (!result) {
                return false;
            }
        }
        return true;
    };
};

export const CheckSiteIsPublic: Check = async (context) => {
    if (context.siteId === undefined) {
        return false;
    }
    const site = await context.tx.pullOne(Site, (s) => s.accessMode, { key: context.siteId });
    return (site.accessMode === AccessMode.PublicReadOnly) || (site.accessMode === AccessMode.PublicContributions);
};

export const CheckSiteIsPublicContributions: Check = async (context) => {
    if (context.siteId === undefined) {
        return false;
    }
    const site = await context.tx.pullOne(Site, (s) => s.accessMode, { key: context.siteId });
    return (site.accessMode === AccessMode.PublicContributions);
};

/**
 * Check if the user is logged in. This only checks if there is a user VNID in the context - it doesn't validate it.
 * @returns true or false
 */
export const CheckUserIsLoggedIn: Check = (context) => {
    return !!(context.userId);
};

/**
 * Check if the user is the SYSTEM user that has permission to do anything (administer the realm)
 * @returns true or false
 */
export const CheckUserIsRealmSuperAdmin: Check = (context) => {
    return context.userId === SYSTEM_VNID;
};

export const CheckUserBelongsToAnyGroup: Check = async (context) => {
    if (!context.userId || !context.siteId) {
        return false;
    }
    const result = await context.tx.query(C`
        MATCH (user:${User} {id: ${context.userId}})
        MATCH (group:${Group})-[:${Group.rel.BELONGS_TO}*1..${
        C(String(GroupMaxDepth))
    }]->(site:${Site} {id: ${context.siteId}})
        // The following will match if the user is in one of those groups OR if the user is a bot inheriting permissions from its owner who is in one of those groups
        MATCH (group)-[:${Group.rel.HAS_USER}]->(userOrOwner:${User})<-[:${BotUser.rel.OWNED_BY}*0..1 {inheritPermissions: true}]-(user)
        RETURN group.id LIMIT 1
    `);
    return result.length > 0;
};

/**
 * Check that the user belongs to a group(s) that has/have ALL of the specified permission grants
 * @param grants
 * @returns
 */
export const CheckUserHasGrants = (...grants: PermissionGrant[]): Check => {
    if (grants.length === 0) {
        throw new Error("Don't use CheckUserHasGrants() with no arguments.");
    }
    return async (context) => {
        if (!context.userId || !context.siteId) {
            return false;
        }
        const result = await context.tx.query(C`
            MATCH (user:${User} {id: ${context.userId}})
            MATCH (group:${Group})-[:${Group.rel.BELONGS_TO}*1..${
            C(String(GroupMaxDepth))
        }]->(site:${Site} {id: ${context.siteId}})
            // The following will match if the user is in one of those groups OR if the user is a bot inheriting permissions from its owner who is in one of those groups
            MATCH (group)-[:${Group.rel.HAS_USER}]->(userOrOwner:${User})<-[:${BotUser.rel.OWNED_BY}*0..1 {inheritPermissions: true}]-(user)
        `.RETURN({ group: Field.VNode(Group) }));

        for (const grant of grants) {
            if (result.map((r) => r.group[grant]).includes(true)) {
                continue; // One of this user's groups has the required permission, now go on to check the next one.
            }
            // None of this user's groups grant this required permission
            return false;
        }
        // All grants were satisfied.
        return true;
    };
};

// Entry-related permission checks:
export const CanViewEntries: Check = OneOf(
    CheckSiteIsPublic, // If the site is public, anyone can view entries, even if they're not logged in
    CheckUserBelongsToAnyGroup, // If the site is private, the user can _view_ entries by belonging to any Group
);
// Home page of the site:
export const CanViewHomePage: Check = CanViewEntries;
// Schema
export const CanViewSchema: Check = OneOf(
    CheckSiteIsPublic, // If the site is public, anyone can view its schema, even if they're not logged in
    CheckUserBelongsToAnyGroup, // If the site is private, the user can _view_ the schema by belonging to any Group
);
// Drafts:
export const CanViewDrafts: Check = CanViewEntries;
export const CanProposeEntryEdits: Check = AllOf(
    CheckUserIsLoggedIn,
    OneOf(
        CheckSiteIsPublicContributions, // If the site is "public contributions" and the user is logged in, they can propose edits
        CheckUserHasGrants(PermissionGrant.proposeEntryEdits), // Or if the user's groups explicitly have the "proposeEntryChanges" grant
    ),
);
export const CanApproveEntryEdits: Check = CheckUserHasGrants(PermissionGrant.approveEntryEdits);
export const CanProposeSchemaChanges: Check = AllOf(
    CheckUserIsLoggedIn,
    OneOf(
        CheckSiteIsPublicContributions, // If the site is "public contributions" and the user is logged in, they can propose schema changes
        CheckUserHasGrants(PermissionGrant.proposeSchemaChanges), // Or if the user's groups explicitly have the "proposeSchemaChanges" grant
    ),
);
export const CanApproveSchemaChanges: Check = CheckUserHasGrants(PermissionGrant.approveSchemaChanges);
export const CanCreateDraft: Check = OneOf(CanProposeEntryEdits, CanProposeSchemaChanges);
// General site admin:
export const CanCreateSite: Check = CheckUserIsLoggedIn; // For now, any logged in user can create new sites.
export const CanEditSiteSettings: Check = CheckUserHasGrants(PermissionGrant.administerSite);
export const CanEditSiteGroups: Check = CheckUserHasGrants(PermissionGrant.administerGroups);
export const CanEraseAllSiteContent: Check = CheckUserIsRealmSuperAdmin;

export const permissions = {
    CanViewEntries,
    CanViewHomePage,
    CanProposeEntryEdits,
    CanApproveEntryEdits,
    CanViewSchema,
    CanProposeSchemaChanges,
    CanApproveSchemaChanges,
    CanViewDrafts,
    CanCreateDraft,
    CanCreateSite,
    CanEditSiteSettings,
    CanEditSiteGroups,
    CanEraseAllSiteContent,
};
