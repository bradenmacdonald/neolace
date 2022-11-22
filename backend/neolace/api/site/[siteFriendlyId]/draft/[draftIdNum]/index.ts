import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getDraft, getDraftIdFromRequest } from "neolace/api/site/[siteFriendlyId]/draft/_helpers.ts";

export class DraftResource extends NeolaceHttpResource {
    public paths = ["/site/:siteFriendlyId/draft/:draftIdNum"];

    GET = this.method({
        responseSchema: api.DraftSchema,
        description: "Get a draft",
    }, async ({ request }) => {
        // Permissions and parameters:
        const { siteId } = await this.getSiteDetails(request);
        const draftId = await getDraftIdFromRequest(request, siteId);
        await this.requirePermission(request, api.CorePerm.viewDraft, { draftId });
        const flags = this.getRequestFlags(request, api.GetDraftFlags);

        // Response:
        const graph = await getGraph();
        return await graph.read((tx) => getDraft(draftId, tx, flags));
    });
}
