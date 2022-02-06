import { VNID } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, NeolaceHttpResource, permissions } from "neolace/api/mod.ts";
import { getDraft } from "neolace/api/site/{siteShortId}/draft/_helpers.ts";
import { UpdateDraft } from "neolace/core/edit/Draft.ts";

/**
 * Add an additional edit to a draft
 */
export class DraftEditsResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/draft/:draftId/edit"];

    POST = this.method({
        requestBodySchema: api.CreateEditSchema,
        responseSchema: api.schemas.Schema({}),
        description: "Add a new edit to the draft.",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = this.requireUser(request);
        const { siteId } = await this.getSiteDetails(request);
        const draftId = VNID(request.pathParam("draftId"));
        await this.requirePermission(request, permissions.CanEditDraft(draftId));
        const graph = await getGraph();
        // Validate that the draft exists in the site:
        const _draft = await graph.read((tx) => getDraft(draftId, siteId, tx));

        // At this point, we know the draft is valid and the user has permission to add edits to it. But what type of edits?
        const editType = api.getEditType(bodyData.code);
        if (editType.changeType === api.EditChangeType.Content) {
            await this.requirePermission(request, permissions.CanProposeEntryEdits);
        } else if (editType.changeType === api.EditChangeType.Schema) {
            await this.requirePermission(request, permissions.CanProposeSchemaChanges);
        }

        await graph.runAs(
            user.id,
            UpdateDraft({
                key: draftId,
                // deno-lint-ignore no-explicit-any
                addEdits: [{ code: bodyData.code as any, data: bodyData.data as any }],
                // note that DraftEdit will validate the data before committing the transaction
            }),
        );

        // Response:
        return {};
    });
}