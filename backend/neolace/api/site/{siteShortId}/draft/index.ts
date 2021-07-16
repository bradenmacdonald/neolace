import { NeolaceHttpResource, graph, api, permissions, adaptErrors } from "neolace/api/mod.ts";
import { CreateDraft } from "neolace/core/edit/Draft.ts";
import { getDraft } from "./_helpers.ts";



export class DraftIndexResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/draft"];

    POST = this.method({
        requestBodySchema: api.CreateDraftSchema,
        responseSchema: api.DraftSchema,
        description: "Create a new draft",
    }, async (payload) => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanCreateDraft);
        const {siteId} = await this.getSiteDetails();
        const userId = this.requireUser().id;

        // Response:
        const edits = payload.edits as api.EditList;

        let hasSchemaChanges = false;
        let hasEntryChanges = false;
        for (const idx in edits) {
            const e = edits[idx];  // The payload validator will have checked that "e" has .code and .data, but not check their value
            const editType = api.getEditType.OrNone(e.code);
            if (editType === undefined) {
                throw new api.InvalidFieldValue([{fieldPath: `edits.${idx}.code`, message: `Invalid edit code: "${e.code}"`}]);
            }
            if (editType.changeType === api.EditChangeType.Schema) {
                hasSchemaChanges = true;
            } else if (editType.changeType === api.EditChangeType.Content) {
                hasEntryChanges = true;
            } else { throw `Unexpected entry change type ${editType.changeType}`; }
            // Validate the data too:
            try {
                editType.dataSchema(e.data);
            } catch (err) {
                throw new api.InvalidFieldValue([{fieldPath: `edits.${idx}.data`, message: `Invalid edit data: "${err.message}"`}]);
            }
        }

        if (hasEntryChanges) {
            await this.requirePermission(permissions.CanProposeEntryEdits);
        }
        if (hasSchemaChanges) {
            await this.requirePermission(permissions.CanProposeSchemaChanges);
        }

        const {id} = await graph.runAs(userId, CreateDraft({
            siteId,
            authorId: userId,
            title: payload.title,
            description: payload.description,
            edits,
        })).catch(adaptErrors("title", "description", adaptErrors.remap("data", "edits.?.data")));

        // Response:
        return await graph.read(tx => getDraft(id, siteId, tx));
    });
}
