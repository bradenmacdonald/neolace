import { VNID } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, NeolaceHttpResource, permissions } from "neolace/api/mod.ts";
import { AcceptDraft, Draft } from "neolace/core/edit/Draft.ts";

export class AcceptDraftResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/draft/:draftId/accept"];

    POST = this.method({
        responseSchema: api.schemas.Schema({}),
        description: "Accept a draft",
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewDrafts);
        const userId = this.requireUser(request).id;
        const { siteId } = await this.getSiteDetails(request);
        const draftId = VNID(request.pathParam("draftId") ?? "");
        const graph = await getGraph();

        // Some permissions depend on whether the draft contains schema changes or not:
        const draft = await graph.pullOne(Draft, (d) => d.site((s) => s.id).hasSchemaChanges().hasContentChanges(), {
            key: draftId,
        });
        if (draft.site?.id !== siteId) {
            throw new api.NotFound(`Draft not found`);
        }
        if (draft.hasContentChanges) {
            await this.requirePermission(request, permissions.CanApproveEntryEdits);
        }
        if (draft.hasSchemaChanges) {
            await this.requirePermission(request, permissions.CanApproveSchemaChanges);
        }
        if (!(draft.hasContentChanges) && !(draft.hasSchemaChanges)) {
            throw new api.InvalidRequest(api.InvalidRequestReason.DraftIsEmpty, "Draft is empty");
        }

        await graph.runAs(userId, AcceptDraft({ id: draftId }));

        // Response:
        return {};
    });
}
