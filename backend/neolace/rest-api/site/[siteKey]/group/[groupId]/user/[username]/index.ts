/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph, NeolaceHttpRequest, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { EmptyResultError, VNID } from "neolace/deps/vertex-framework.ts";
import { Group, User } from "neolace/core/mod.ts";
import { UpdateGroup } from "neolace/core/permissions/Group.ts";

export class SiteGroupMemberResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/group/:groupId/user/:username"];

    /**
     * Make this user a member of the specified group.
     * This is an idempotent operation.
     */
    PUT = this.method({
        responseSchema: SDK.schemas.Schema({}),
        description: "Add a user to the group.",
    }, async ({ request }) => {
        const requestUser = await this.requireUser(request);
        await this.requirePermission(request, SDK.CorePerm.siteAdminManageGroupMembership);
        const graph = await getGraph();

        const { group, targetUser } = await this.getGroupAndTargetUser(request);

        await graph.runAs(
            requestUser.id,
            UpdateGroup({
                id: group.id,
                addUsers: [targetUser.id],
            }),
        );

        return {};
    });

    /**
     * Remove this user from the specified group.
     * This is an idempotent operation.
     */
    DELETE = this.method({
        responseSchema: SDK.schemas.Schema({}),
        description: "Remove a user from the group.",
    }, async ({ request }) => {
        const requestUser = await this.requireUser(request);
        await this.requirePermission(request, SDK.CorePerm.siteAdminManageGroupMembership);
        const graph = await getGraph();

        const { group, targetUser } = await this.getGroupAndTargetUser(request);

        await graph.runAs(
            requestUser.id,
            UpdateGroup({
                id: group.id,
                removeUsers: [targetUser.id],
            }),
        );

        return {};
    });

    private async getGroupAndTargetUser(request: NeolaceHttpRequest) {
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);
        const groupId = VNID(request.pathParam("groupId") ?? "");
        const username = request.pathParam("username") ?? "";

        let group;
        try {
            group = await graph.pullOne(Group, (g) => g.id.site((s) => s.id), { with: { id: groupId } });
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new SDK.NotFound("group does not exist");
            }
            throw err;
        }

        if (group.site?.id !== siteId) {
            throw new SDK.NotFound("group does not exist");
        }

        let targetUser;
        try {
            targetUser = await graph.pullOne(User, (u) => u.id, { with: { username } });
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new SDK.NotFound("user does not exist");
            }
            throw err;
        }
        return { group, targetUser };
    }
}
