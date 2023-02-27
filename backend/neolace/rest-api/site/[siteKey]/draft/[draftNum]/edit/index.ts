import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import {
    checkPermissionsRequiredForEdits,
    getDraft,
    getDraftIdFromRequest,
} from "neolace/rest-api/site/[siteKey]/draft/_helpers.ts";
import { UpdateDraft } from "neolace/core/edit/Draft-actions.ts";

/**
 * Add an additional edit to a draft
 */
export class DraftEditsResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/draft/:draftNum/edit"];

    POST = this.method({
        requestBodySchema: SDK.CreateEditSchema,
        responseSchema: SDK.schemas.Schema({}),
        description: "Add a new edit to the draft.",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = this.requireUser(request);
        const { siteId } = await this.getSiteDetails(request);
        const draftId = await getDraftIdFromRequest(request, siteId);
        await this.requirePermission(request, SDK.CorePerm.editDraft, { draftId });
        const graph = await getGraph();
        // Validate that the draft exists in the site:
        const draft = await graph.read((tx) => getDraft(draftId, tx, new Set([SDK.GetDraftFlags.IncludeEdits])));

        // At this point, we know the draft is valid and the user has permission to add edits to it.
        // But we still have to check if they have permission for the specific type of edits:
        const existingEdits = draft.edits;
        await checkPermissionsRequiredForEdits(
            [bodyData],
            await this.getPermissionSubject(request),
            "propose",
            existingEdits,
        );

        await graph.runAs(
            user.id,
            UpdateDraft({
                id: draftId,
                // deno-lint-ignore no-explicit-any
                addEdits: [{ code: bodyData.code as any, data: bodyData.data as any }],
                // note that DraftEdit will validate the data before committing the transaction
            }),
        );

        // Response:
        return {};
    });
}
