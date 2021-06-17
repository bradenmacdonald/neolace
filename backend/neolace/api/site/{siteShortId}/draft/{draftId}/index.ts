import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors, requirePermission, permissions, getSiteDetails } from "../../../..";
import { getDraft } from "../_helpers";

defineEndpoint(__filename, {
    method: "GET",
    options: {
        description: "Get a draft",
        //notes: "...",
        auth: {mode: "optional", strategy: "technotes_strategy"},
        tags: ["api"],
        validate: {},
    },
    handler: async (request, h) => {
        // Permissions and parameters:
        await requirePermission(request, permissions.CanViewDrafts);
        const {siteId} = await getSiteDetails(request);
        const draftId = request.params.draftId;

        // Response:
        const draftData = await graph.read(tx => getDraft(draftId, siteId, tx));
        return h.response(draftData);

    },
});
