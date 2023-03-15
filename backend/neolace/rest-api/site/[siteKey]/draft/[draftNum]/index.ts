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
import { getDraft, getDraftIdFromRequest } from "neolace/rest-api/site/[siteKey]/draft/_helpers.ts";

export class DraftResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/draft/:draftNum"];

    GET = this.method({
        responseSchema: SDK.DraftSchema,
        description: "Get a draft",
    }, async ({ request }) => {
        // Permissions and parameters:
        const { siteId } = await this.getSiteDetails(request);
        const draftId = await getDraftIdFromRequest(request, siteId);
        await this.requirePermission(request, SDK.CorePerm.viewDraft, { draftId });
        const flags = this.getRequestFlags(request, SDK.GetDraftFlags);

        // Response:
        const graph = await getGraph();
        return await graph.read((tx) => getDraft(draftId, tx, flags));
    });
}
