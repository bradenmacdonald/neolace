/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { C, Field } from "neolace/deps/vertex-framework.ts";
import { Group, Site, User } from "neolace/core/mod.ts";
import { CreateGroup, GroupMaxDepth } from "neolace/core/permissions/Group.ts";
import { PermissionGrant } from "../../../../core/permissions/grant.ts";

export class SiteGroupsResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/group"];

    /**
     * List the user groups configured on this site.
     */
    GET = this.method({
        responseSchema: SDK.schemas.PaginatedResult(SDK.GroupSummary),
        description: "List the user groups configured on this site",
    }, async ({ request }) => {
        await this.requirePermission(request, SDK.CorePerm.siteAdminViewGroup);
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);

        const data = await graph.read((tx) =>
            tx.query(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (group:${Group})-[:${Group.rel.BELONGS_TO}*1..${C(String(GroupMaxDepth))}]->(site)
            // Compute the details of the group
            OPTIONAL MATCH (group)-[:${Group.rel.HAS_USER}]->(user:${User})
            WITH site, group, count(user) AS numUsers
            OPTIONAL MATCH (group)-[:${Group.rel.BELONGS_TO}]->(parentGroup:${Group})
            RETURN group.name AS name, group.id AS id, numUsers, parentGroup.id AS parentGroupId
            ORDER BY group.name
        `.givesShape({
                id: Field.VNID,
                name: Field.String,
                numUsers: Field.Int,
                parentGroupId: Field.NullOr.VNID,
            }))
        );

        return {
            values: data.map((g) => ({ ...g, parentGroupId: g.parentGroupId ?? undefined })),
            totalCount: data.length,
        };
    });

    /**
     * Create a new group on this site
     */
    POST = this.method({
        requestBodySchema: SDK.CreateGroup,
        responseSchema: SDK.GroupDetails,
        description: "Create a new user group on this site.",
    }, async ({ request, bodyData }) => {
        const { siteId } = await this.getSiteDetails(request);
        const user = await this.requireUser(request);
        await this.requirePermission(request, SDK.CorePerm.siteAdminManageGroup);
        const graph = await getGraph();

        const grantStrings = bodyData.grantStrings ?? [];
        for (const grantStr of grantStrings) {
            try {
                PermissionGrant.parse(grantStr);
            } catch {
                throw new SDK.InvalidFieldValue([{ fieldPath: "grantStrings", message: "Invalid grant string." }]);
            }
        }

        const { id } = await graph.runAs(
            user.id,
            CreateGroup({
                name: bodyData.name,
                grantStrings,
                belongsTo: bodyData.parentGroupId ?? siteId,
            }),
        );

        return {
            id,
            name: bodyData.name,
            grantStrings,
            numUsers: 0,
            parentGroupId: bodyData.parentGroupId,
        };
    });
}
