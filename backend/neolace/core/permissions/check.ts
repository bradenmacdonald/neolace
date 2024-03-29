/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { log } from "neolace/app/log.ts";
import { C, CypherQuery, Field, SYSTEM_VNID, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { getGraph } from "neolace/core/graph.ts";
import { ActionObject, ActionSubject } from "./action.ts";
import { getPerm, PermissionName } from "./permissions.ts";
import { Group, GroupMaxDepth } from "neolace/core/permissions/Group.ts";
import { BotUser, User } from "neolace/core/User.ts";
import { Site } from "neolace/core/Site.ts";
import { AllOfCondition, Always, GrantCondition, OneOfCondition, PermissionGrant } from "./grant.ts";
import { getSitePublicGrants } from "./default-grants.ts";

/**
 * A very short-term cache that is used internally by checkPermissions() to speed up checking multiple permissions.
 * This cache is just for a single subject during a single request, and should not be long-lived.
 */
interface PreCheckCache {
    /** Grants that are automatic for all users on the site */
    allDefaultGrants?: PermissionGrant[];
    /** Grants that the subject (the user) has, based on their group membership */
    groupGrants?: PermissionGrant[];
}

/** Check that we have enough data about the object to determine the given permissions */
async function ensureObjectData(perms: Set<PermissionName>, object: ActionObject) {
    for (const permName of perms) {
        const perm = await getPerm(permName);
        if (perm) {
            for (const keyNeeded of perm.requiresObjectFields) {
                if (!(keyNeeded in object)) {
                    throw new Error(
                        `Internal error: to check for the "${permName}" permission, the action object must include {${keyNeeded}: ...}`,
                    );
                }
            }
        }
    }
}

export async function hasPermission(
    subject: ActionSubject,
    verb: PermissionName | readonly PermissionName[],
    object: ActionObject,
): Promise<boolean> {
    // Get the complete list of permissions needed:
    const needed = await getAllRequiredPermissions(Array.isArray(verb) ? [...verb] : [verb]);
    // Check that we have enough data about the object to determine those permissions:
    await ensureObjectData(needed, object);
    // Do prechecks on these permissions:
    const cache: PreCheckCache = {};
    let { result, conditionalYes } = await preChecks(subject, needed, cache);

    if (!result && conditionalYes) {
        // The preliminary checks show that this user doesn't have permission, but one of the conditional grants may
        // apply to them, so now we have to evaluate the relevant conditional grants.
        const { getTx, closeTx } = makeCloseableTransactionOnDemand();
        try {
            result = await conditionalYes.appliesTo({ subject, object, getTx });
        } finally {
            closeTx();
        }
    }

    // Check if any plugins want to override the permissions check
    result = await doPluginOverrides(subject, needed, object, result) ?? result;
    return result;
}

/**
 * An efficient way to check if a user has permission for a set of objects.
 *
 * Returns a boolean array of the same length as objects.
 */
export async function checkPermissionsForAll(
    subject: ActionSubject,
    verb: PermissionName | readonly PermissionName[],
    objects: ActionObject[],
): Promise<boolean[]> {
    // Get the complete list of permissions needed:
    const needed = await getAllRequiredPermissions(Array.isArray(verb) ? [...verb] : [verb]);
    // Check that we have enough data about the object to determine those permissions:
    await Promise.all(objects.map((object) => ensureObjectData(needed, object)));
    // Do prechecks on these permissions:
    const cache: PreCheckCache = {};
    const { result: unconditionalResult, conditionalYes } = await preChecks(subject, needed, cache);

    const { getTx, closeTx } = makeCloseableTransactionOnDemand();
    const results = [];
    try {
        for (const object of objects) {
            let result = unconditionalResult;
            if (!unconditionalResult && conditionalYes) {
                // The preliminary checks show that this user doesn't have permission, but one of the conditional grants may
                // apply to them, so now we have to evaluate the relevant conditional grants.
                result = await conditionalYes.appliesTo({ subject, object, getTx });
            }
            // Check if any plugins want to override the permissions check
            result = await doPluginOverrides(subject, needed, object, result) ?? result;
            results.push(result);
        }
    } finally {
        closeTx();
    }
    return results;
}

/**
 * Given a list of permissions, check which of those permissions the user (subject) has for the given object.
 * Returns a list of booleans in the same order as the list of permissions given (verbs)
 */
export async function checkPermissions(
    subject: ActionSubject,
    verbs: readonly PermissionName[],
    object: ActionObject,
): Promise<boolean[]> {
    const cache: PreCheckCache = {};
    const results: boolean[] = [];

    for (const perm of verbs) {
        // Get the complete list of permissions needed:
        const needed = await getAllRequiredPermissions([perm]);
        // Check that we have enough data about the object to determine those permissions:
        await ensureObjectData(needed, object);

        // Do prechecks on this permissions:
        let { result, conditionalYes } = await preChecks(subject, needed, cache);

        if (!result && conditionalYes) {
            // The preliminary checks show that this user doesn't have permission, but one of the conditional grants may
            // apply to them, so now we have to evaluate the relevant conditional grants.
            const { getTx, closeTx } = makeCloseableTransactionOnDemand();
            try {
                result = await conditionalYes.appliesTo({ subject, object, getTx });
            } finally {
                closeTx();
            }
        }

        // Check if any plugins want to override the permissions check
        result = await doPluginOverrides(subject, needed, object, result) ?? result;
        results.push(result);
    }
    return results;
}

export async function makeCypherCondition(
    subject: ActionSubject,
    verb: PermissionName | PermissionName[],
    partialObject: ActionObject,
    cypherVars: string[],
): Promise<CypherQuery> {
    // Get the complete list of permissions needed:
    const needed = await getAllRequiredPermissions(Array.isArray(verb) ? [...verb] : [verb]);
    // Do prechecks on these permissions:
    const cache: PreCheckCache = {};
    const { result, conditionalYes } = await preChecks(subject, needed, cache);

    let predicate: CypherQuery;
    if (result) {
        // The preliminary checks show that this user definitely has permission:
        predicate = C`true`;
    } else {
        // The preliminary checks show that this user doesn't have permission, but the conditional grants may
        // apply to them, so now we have to evaluate the relevant conditions.
        predicate = conditionalYes?.asCypherPredicate({ subject, partialObject, cypherVars }) ?? C`false`;
    }

    // Check if any plugins want to override the permissions check
    const override = await doPluginOverrides(subject, needed, partialObject, undefined);
    // The normal case will be 'undefined', which means that no plugin wishes to override the result
    if (override !== undefined) {
        predicate = override ? C`true` : C`false`;
    }
    return predicate;
}

/**
 * Common logic for checking a user's permissions to do a specific action.
 *
 * If we can tell that they have permission using some quick and easy checks, we return {result: true}
 * Otherwise, if we have to check some more complex conditions, we return {result: false} and a condition that we have
 * to check. If the condition is true, the user does have permission.
 */
async function preChecks(
    subject: ActionSubject,
    allNeeded: ReadonlySet<PermissionName>,
    cache: PreCheckCache,
): Promise<{ result: true; conditionalYes?: undefined } | { result: false; conditionalYes?: GrantCondition }> {
    // Short circuit for the system user, who is always granted all permissions.
    if (subject.userId === SYSTEM_VNID) {
        return { result: true };
    }

    if (allNeeded.size === 0) {
        // Apparently no permissions are actually needed.
        return { result: true };
    }

    const needed = new Set(allNeeded);
    // Get the default grants for the site.
    const allDefaultGrants = cache.allDefaultGrants ??
        (cache.allDefaultGrants = await getSitePublicGrants(subject.siteId));
    // Do the default grants cover the required permissions? If so we can save a lot of time by returning true now.
    const resolveUnconditionalGrants = (grants: PermissionGrant[]) => {
        for (const grant of grants) {
            // Does this grant give any of the permissions we need?
            for (const n of needed) {
                if (grant.givesPermission(n) && !grant.isConditional) {
                    needed.delete(n);
                }
            }
        }
    };
    resolveUnconditionalGrants(allDefaultGrants);
    if (needed.size === 0) {
        // The unconditional default grants have already provided the required permissions
        return { result: true };
    }

    // At this point, 'needed' is the set of remaining permissions that the user still requires to do this action.

    // Check what permisison grants the user has from any groups that they may belong to:
    const groupGrants: PermissionGrant[] = cache.groupGrants ?? (cache.groupGrants = await (async () => {
        const groups = await getUserGroups(subject);
        return (await Promise.all(groups.map((g) => getGroupGrants(g)))).flat();
    })());
    resolveUnconditionalGrants(groupGrants);
    if (needed.size === 0) {
        // The unconditional default grants have already provided the required permissions
        return { result: true };
    }

    // At this point, we need to check conditional grants (grants that only apply in some cases):
    const conditionalGrants = [...allDefaultGrants, ...groupGrants].filter((g) => g.isConditional);
    // Determine under what condition, if any those grants will provide this user with the required permissions:
    const conditionalYes = determineCondition(needed, conditionalGrants);
    return { result: false, conditionalYes };
}

async function getAllRequiredPermissions(permissionNames: PermissionName[]): Promise<Set<PermissionName>> {
    const needed = new Set<PermissionName>();
    for (const pName of permissionNames) {
        needed.add(pName);
        const perm = await getPerm(pName);
        if (perm && perm.requires) {
            for (const required of await getAllRequiredPermissions(perm.requires)) {
                needed.add(required);
            }
        } else if (perm === undefined) {
            log.warning(`Warning: unknown permission ${pName}`);
        }
    }
    return needed;
}

/**
 * Get the VNIDs of the groups that the current user has on the current site, if any.
 * TODO: cache this in Redis?
 */
async function getUserGroups(subject: ActionSubject): Promise<VNID[]> {
    if (!subject.userId || !subject.siteId) {
        return [];
    }
    const graph = await getGraph();
    const result = await graph.read(async (tx) =>
        tx.query(C`
            MATCH (user:${User} {id: ${subject.userId}})
            MATCH (group:${Group})-[:${Group.rel.BELONGS_TO}*1..${
            C(String(GroupMaxDepth))
        }]->(site:${Site} {id: ${subject.siteId}})
            // The following will match if the user is in one of those groups OR
            // if the user is a bot inheriting permissions from its owner who is in one of those groups
            MATCH (group)-[:${Group.rel.HAS_USER}]->(userOrOwner:${User})<-[:${BotUser.rel.OWNED_BY}*0..1 {inheritPermissions: true}]-(user)
            RETURN group.id AS id
        `.givesShape({ id: Field.VNID }))
    );
    return result.map((r) => r.id);
}

/**
 * Get the permission grants given by a particular group.
 * TODO: cache this in Redis or local memory (Stale While Revalidate)
 */
async function getGroupGrants(groupId: VNID): Promise<PermissionGrant[]> {
    const graph = await getGraph();
    const groupData = await graph.pullOne(Group, (g) => g.grantStrings, { key: groupId });
    if (groupData.grantStrings === null) {
        return [];
    }
    const result: PermissionGrant[] = [];
    for (const grantString of groupData.grantStrings) {
        try {
            result.push(PermissionGrant.parse(grantString));
        } catch (err) {
            log.error(`Unable to parse group ${groupId}'s grant string "${grantString}"`, err);
        }
    }
    return result;
}

async function doPluginOverrides(
    _subject: ActionSubject,
    _perms: ReadonlySet<string>,
    _object: ActionObject,
    currentResult: boolean | undefined,
): Promise<boolean | undefined> {
    return currentResult;
}

/**
 * Given that the user needs the specified permissions, but also has the specified permission _grants_ which have
 * certain conditions attached to them, determine under what condition(s) if any the user will have the required
 * permissions.
 *
 * For example, if the user needs Set(["edit.entry", "view.entry"]) and has two conditional grants,
 * ("view*" IfLoggedIn) and ("edit.entry" EntryTypesCondition(entryType == BlogPost)), then the result of this function
 * would be that the user needs to meet the condition (IfLoggedIn AND entryType == BlogPost) in order to have the
 * required permissions.
 */
function determineCondition(
    neededPermissions: Set<PermissionName>,
    conditionalGrants: PermissionGrant[],
): GrantCondition | undefined {
    if (neededPermissions.size === 0) {
        return Always; // If they don't need any permissions, they'll always meet the required conditions.
    }
    const neededConditions: GrantCondition[] = [];
    for (const perm of Array.from(neededPermissions).sort()) {
        const thisConditions = conditionalGrants.filter((g) => g.givesPermission(perm)).map((g) => g.condition);
        if (thisConditions.length === 0) {
            return undefined; // None of the conditional grants will give the required permission
        } else if (thisConditions.length === 1) {
            neededConditions.push(thisConditions[0]);
        } else {
            // If any one of these conditions is true, the user has this permission (boolean OR)
            neededConditions.push(new OneOfCondition(thisConditions));
        }
    }
    if (neededConditions.length === 0) {
        throw new Error("Internal error");
    } else if (neededConditions.length === 1) {
        return neededConditions[0];
    } else {
        return new AllOfCondition(neededConditions).simplify();
    }
}

/**
 * Helper function that can open a graph transaction only if needed, when some code calls the 'getTx()' method that this
 * returns. The code using this MUST call closeTx() to manually close the transaction once it's no longer needed.
 *
 * If getTx() is never called, no transaction will be opened.
 */
function makeCloseableTransactionOnDemand(): {
    getTx: () => Promise<WrappedTransaction>;
    closeTx: () => Promise<void>;
} {
    let txPromise: Promise<WrappedTransaction>;
    let txClosedPromise: Promise<void>;
    let resolveWorkPromise: () => void;
    const workPromise = new Promise<void>((r) => {
        resolveWorkPromise = r;
    });
    const getTx = () => {
        if (txPromise === undefined) {
            txPromise = new Promise((resolveTx) => {
                getGraph().then((graph) => {
                    txClosedPromise = graph.read((tx) => {
                        resolveTx(tx);
                        return workPromise;
                    });
                });
            });
        }
        return txPromise;
    };
    return {
        getTx,
        closeTx: () => {
            if (resolveWorkPromise) {
                resolveWorkPromise(); // This will tell Neo4j that we're done using the transaction, and it can be closed
                return txClosedPromise; // This will be resolved once the transaction is actually closed
            }
            return new Promise((r) => r()); // We never opened a transaction, so no need to close it.
        },
    };
}

// These funcitons are private to this file, but we need to be able to test them.
export const _forTests = {
    getUserGroups,
    getAllRequiredPermissions,
    determineCondition,
    makeCloseableTransactionOnDemand,
};
