import { EditChangeType, EditList, getEditType } from "neolace-api";
import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors, requirePermission, permissions, getSiteDetails, requireUserId } from "../../..";
import { CreateDraft } from "../../../../core/edit/Draft";
import { getDraft } from "./_helpers";

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Create a new draft",
        //notes: "...",
        auth: {mode: "optional", strategy: "technotes_strategy"},
        tags: ["api"],
        validate: {
            payload: Joi.object({
                title: Joi.string().required(),
                description: Joi.string().allow(null),
                edits: Joi.array(),
            }),
        },
    },
    handler: async (request, h) => {
        // Permissions and parameters:
        await requirePermission(request, permissions.CanCreateDraft);
        const {siteId} = await getSiteDetails(request);
        const userId = requireUserId(request);
        const payload = request.payload as any;

        const edits: EditList = payload.edits ?? [];

        let hasSchemaChanges = false;
        let hasEntryChanges = false;
        for (const e of edits) {
            if (!e.code || !e.data) {
                throw new api.InvalidFieldValue(["edits"], "An edit is missing its .code or .data property");
            }
            const editType = getEditType.OrNone(e.code);
            if (editType === undefined) {
                throw new api.InvalidFieldValue(["edits"], `Invalid edit code: ${e.code}`);
            }
            if (editType.changeType === EditChangeType.Schema) {
                hasSchemaChanges = true;
            } else if (editType.changeType === EditChangeType.Content) {
                hasEntryChanges = true;
            } else { throw `Unexpected entry change type ${editType.changeType}`; }
        }

        if (hasEntryChanges) {
            await requirePermission(request, permissions.CanProposeEntryEdits);
        }
        if (hasSchemaChanges) {
            await requirePermission(request, permissions.CanProposeSchemaChanges);
        }

        const {id} = await graph.runAs(userId, CreateDraft({
            siteId,
            authorId: userId,
            title: payload.title,
            description: payload.description,
            edits,
        }));

        // Response:
        const draftData = await graph.read(tx => getDraft(id, siteId, tx));
        return h.response(draftData);
    },
});
