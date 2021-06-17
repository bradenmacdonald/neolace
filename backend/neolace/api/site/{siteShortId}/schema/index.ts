import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors, requirePermission, permissions, getSiteDetails } from "../../..";
import { getCurrentSchema } from "../../../../core/schema/get-schema";

defineEndpoint(__filename, {
    method: "GET",
    options: {
        description: "Get the site's schema",
        //notes: "...",
        auth: {mode: "optional", strategy: "technotes_strategy"},
        tags: ["api"],
        validate: {},
    },
    handler: async (request, h) => {
        // Permissions and parameters:
        await requirePermission(request, permissions.CanViewSchema);
        const {siteId} = await getSiteDetails(request);

        // Response:
        const schema = await graph.read(tx => getCurrentSchema(tx, siteId));
        return h.response(schema);

    },
});
