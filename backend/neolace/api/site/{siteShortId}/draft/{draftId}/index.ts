import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { getDraft } from "neolace/api/site/{siteShortId}/draft/_helpers.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";



export class DraftResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/draft/:draftId"];

    GET = this.method({
        responseSchema: api.DraftSchema,
        description: "Get a draft",
    }, async () => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanViewDrafts);
        const {siteId} = await this.getSiteDetails();
        const draftId = VNID(this.request.getPathParam("draftId") ?? "");

        // Response:
        return await graph.read(tx => getDraft(draftId, siteId, tx));
    });
}
