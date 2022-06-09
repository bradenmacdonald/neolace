import { api, corePerm, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getDraft } from "neolace/api/site/{siteShortId}/draft/_helpers.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

export class DraftResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/draft/:draftId"];

    GET = this.method({
        responseSchema: api.DraftSchema,
        description: "Get a draft",
    }, async ({ request }) => {
        // Permissions and parameters:
        const { siteId } = await this.getSiteDetails(request);
        const draftId = VNID(request.pathParam("draftId") ?? "");
        await this.requirePermission(request, corePerm.viewDraft.name, { draftId });
        const graph = await getGraph();
        const flags = this.getRequestFlags(request, api.GetDraftFlags);

        // Response:
        return await graph.read((tx) => getDraft(draftId, siteId, tx, flags));
    });
}
