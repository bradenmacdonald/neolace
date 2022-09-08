import * as log from "std/log/mod.ts";

import { adaptErrors, api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { CreateDraft } from "neolace/core/edit/Draft.ts";
import { checkPermissionsRequiredForEdits, getDraft } from "./_helpers.ts";

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

        // Response:
        const edits = bodyData.edits as api.EditList;
        // We don't allow creating an empty draft as it's noisy for other users and we can't really check permissions
        // until we know what type of edits will be in the draft.
        if (edits.length === 0) {
            throw new api.InvalidFieldValue([{
                fieldPath: "edits",
                message: "At least one edit is required to create a draft.", // Because otherwise it's hard to check permissions
            }]);
        }

        for (const idx in edits) {
            const e = edits[idx]; // The payload validator will have checked that "e" has .code and .data, but not check their value
            const editType = api.getEditType.OrNone(e.code);
            if (editType === undefined) {
                throw new api.InvalidFieldValue([{
                    fieldPath: `edits.${idx}.code`,
                    message: `Invalid edit code: "${e.code}"`,
                }]);
            }
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

        await checkPermissionsRequiredForEdits(edits, await this.getPermissionSubject(request), "propose");

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
