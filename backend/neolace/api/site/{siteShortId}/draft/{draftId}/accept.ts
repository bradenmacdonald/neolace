import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors, requirePermission, permissions, getSiteDetails, requireUserId } from "../../../..";
import { AcceptDraft, Draft } from "../../../../../core/edit/Draft";

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Accept a draft",
        //notes: "...",
        auth: {mode: "optional", strategy: "technotes_strategy"},
        tags: ["api"],
        validate: {},
    },
    handler: async (request, h) => {
        // Permissions and parameters:
        await requirePermission(request, permissions.CanViewDrafts);
        const {siteId} = await getSiteDetails(request);
        const userId = requireUserId(request);
        const draftId = request.params.draftId;
        // Some permissions depend on whether the draft contains schema changes or not:
        const draft = await graph.pullOne(Draft, d => d.site(s => s.id).hasSchemaChanges().hasContentChanges())
        if (draft.site?.id !== siteId) {
            throw new api.NotFound(`Draft not found`);
        }
        if (draft.hasContentChanges) {
            await requirePermission(request, permissions.CanApproveEntryEdits);
        }
        if (draft.hasSchemaChanges) {
            await requirePermission(request, permissions.CanApproveSchemaChanges);
        }
        if (!(draft.hasContentChanges) && !(draft.hasSchemaChanges)) {
            throw new api.InvalidRequest(api.InvalidRequestReason.Draft_is_empty, "Draft is emptyy");
        }

        await graph.runAs(userId, AcceptDraft({id: draftId, }));

        // Response:
        return h.response({});

    },
});
