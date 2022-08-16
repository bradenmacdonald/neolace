import { C, Field } from "neolace/deps/vertex-framework.ts";

import { api, corePerm, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { BotUser, User } from "neolace/core/User.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { Group, GroupMaxDepth } from "neolace/core/permissions/Group.ts";
import { Site } from "neolace/core/Site.ts";

export class SiteUserIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/user"];

    GET = this.method({
        responseSchema: api.schemas.PaginatedResult(api.SiteUserSummary),
        description: "List users of this site",
        notes: "This lists all of the users that have been added as members of this site.",
    }, async ({ request }) => {
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        // Permissions and parameters:
        // First of all, the "site admin" permission is required to use this API at all.
        const permSubject = await this.getPermissionSubject(request);
        await this.requirePermission(request, corePerm.siteAdmin.name);
        const page = BigInt(request.queryParam("page") ?? 1n);
        if (page < 1n) throw new api.InvalidFieldValue([{ fieldPath: "page", message: "Invalid page number" }]);
        const limit = 25n; // Hard-coded page size for now.
        const skip = (page - 1n) * limit;

        /**
         * This cypher clause will represent whether or not the current user has permission to view that the target
         * user is a member of at least one group on this site:
         */
        const viewSiteUserPermissionPredicate = await makeCypherCondition(
            permSubject,
            corePerm.siteAdminViewUser.name,
            {},
            ["user", "group"],
        );
        /** This represents whether or not the user has permission to view the groups that each user is in. */
        const viewSiteUserGroupsPermissionPredicate = await makeCypherCondition(
            permSubject,
            corePerm.siteAdminViewGroup.name,
            {},
            ["user", "group"],
        );

        const result = await graph.read((tx) => {
            return tx.query(C`
                MATCH (user:${User})<-[:${Group.rel.HAS_USER}]-(group:${Group})-[:${Group.rel.BELONGS_TO}*1..${
                C(String(GroupMaxDepth))
            }]->(site:${Site} {id: ${siteId}})
                WHERE ${viewSiteUserPermissionPredicate}

                // Include the group information only if permissions allow:
                WITH user, CASE WHEN ${viewSiteUserGroupsPermissionPredicate} THEN group ELSE NULL END AS group
                // We want to return just one row per user, even if the user is part of multiple groups:
                WITH user, collect(group {.id, .name}) AS groups
                // Now also fetch the "owner" information if this user is a bot.
                OPTIONAL MATCH (user)-[:${BotUser.rel.OWNED_BY}]->(owner)

                // Now we do some tricks to return the total count at the same time:
                WITH collect([user, owner, groups]) AS rowsList
                WITH rowsList, size(rowsList) AS totalCount
                UNWIND rowsList AS row
                WITH totalCount, row[0] AS user, row[1] AS owner, row[2] AS groups
                // Now return just the page we want:
                RETURN
                    substring(user.slugId, ${User.slugIdPrefix.length}) AS username,
                    user.fullName AS fullName,
                    owner.slugId AS ownerSlugId,
                    owner.fullName AS ownerFullName,
                    groups AS groups,
                    totalCount
                SKIP ${C(String(skip))} LIMIT ${C(String(limit))}
            `.givesShape({
                username: Field.String,
                fullName: Field.String,
                ownerSlugId: Field.NullOr.String,
                ownerFullName: Field.NullOr.String,
                groups: Field.List(Field.Record({ id: Field.VNID, name: Field.String })),
                totalCount: Field.Int,
            }));
        });

        if (result.length === 0) {
            return { values: [], totalCount: 0 };
        }

        return {
            values: result.map((row) => ({
                username: row.username,
                fullName: row.fullName,
                isBot: row.ownerFullName !== null,
                ownedByUsername: row.ownerSlugId,
                groups: row.groups,
            })),
            totalCount: result[0].totalCount,
        };
    });
}
