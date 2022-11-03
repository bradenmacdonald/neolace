import { VNID } from "neolace/deps/vertex-framework.ts";
import { adaptErrors, api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { consolidateEdits } from "neolace/deps/neolace-api.ts";
import { Draft } from "neolace/core/mod.ts";
import { AcceptDraft } from "neolace/core/edit/Draft-actions.ts";
import { checkPermissionsRequiredForEdits } from "../_helpers.ts";

export class AcceptDraftResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/draft/:draftId/accept"];

    POST = this.method({
        responseSchema: api.schemas.Schema({}),
        description: "Accept a draft",
    }, async ({ request }) => {
        // Permissions and parameters:
        const userId = this.requireUser(request).id;
        const { siteId } = await this.getSiteDetails(request);
        const draftId = VNID(request.pathParam("draftId") ?? "");
        const graph = await getGraph();

        // First permissions check:
        await this.requirePermission(request, api.CorePerm.viewDraft, { draftId });

        // Make sure the draft exists on this site:
        const draft = await graph.pullOne(Draft, (d) => d.site((s) => s.id).edits((e) => e.code.data), {
            key: draftId,
        });
        if (draft.site?.id !== siteId) {
            throw new api.NotFound(`Draft not found`);
        }

        // Now check if the user has permission to apply changes:
        // Consolidate the edits so that we don't do something like create an entry and then immediately delete it.
        const editsConsolidated = consolidateEdits(draft.edits as api.AnyEdit[]);
        await checkPermissionsRequiredForEdits(editsConsolidated, await this.getPermissionSubject(request), "apply");

        await graph.runAs(userId, AcceptDraft({ id: draftId })).catch(adaptErrors());

        // Response:
        return {};
    });
}
