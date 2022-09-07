import * as log from "std/log/mod.ts";
import { adaptErrors, api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { CreateDraft } from "neolace/core/edit/Draft.ts";
import { getDraft } from "./_helpers.ts";

export class DraftIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/draft"];

    POST = this.method({
        requestBodySchema: api.CreateDraftSchema,
        responseSchema: api.DraftSchema,
        description: "Create a new draft",
    }, async ({ request, bodyData }) => {
        const graph = await getGraph();
        const { siteId } = await this.getSiteDetails(request);
        const userId = this.requireUser(request).id;

        // To create any draft at all, the user must have one of these two permissions:
        if (!await this.hasPermission(request, api.CorePerm.proposeEditToEntry)) {
            await this.requirePermission(request, api.CorePerm.proposeEditToSchema);
        }

        // Response:
        const edits = bodyData.edits as api.EditList;

        let hasSchemaChanges = false;
        let hasEntryChanges = false;
        for (const idx in edits) {
            const e = edits[idx]; // The payload validator will have checked that "e" has .code and .data, but not check their value
            const editType = api.getEditType.OrNone(e.code);
            if (editType === undefined) {
                throw new api.InvalidFieldValue([{
                    fieldPath: `edits.${idx}.code`,
                    message: `Invalid edit code: "${e.code}"`,
                }]);
            }
            if (editType.changeType === api.EditChangeType.Schema) {
                hasSchemaChanges = true;
            } else if (editType.changeType === api.EditChangeType.Content) {
                hasEntryChanges = true;
            } else throw `Unexpected entry change type ${editType.changeType}`;
            // Validate the data too:
            try {
                editType.dataSchema(e.data);
            } catch (err) {
                log.warning(`Found invalid edit - data was:`);
                log.warning(e.data);
                throw new api.InvalidFieldValue([{
                    fieldPath: `edits.${idx}.data`,
                    message: `Invalid edit data for ${e.code} edit: "${err.message}"`,
                }]);
            }
        }

        if (hasEntryChanges) {
            await this.requirePermission(request, api.CorePerm.proposeEditToEntry);
        }
        if (hasSchemaChanges) {
            await this.requirePermission(request, api.CorePerm.proposeEditToSchema);
        }

        const { id } = await graph.runAs(
            userId,
            CreateDraft({
                siteId,
                authorId: userId,
                title: bodyData.title,
                description: bodyData.description,
                edits,
            }),
        ).catch(adaptErrors("title", "description", adaptErrors.remap("data", "edits.?.data")));

        // Response:
        return await graph.read((tx) => getDraft(id, siteId, tx));
    });
}
