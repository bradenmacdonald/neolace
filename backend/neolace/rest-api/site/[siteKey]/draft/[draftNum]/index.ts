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
