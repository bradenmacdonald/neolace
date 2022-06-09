import { VNID } from "neolace/deps/vertex-framework.ts";
import { api, corePerm, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { AcceptDraft, Draft } from "neolace/core/edit/Draft.ts";

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
        await this.requirePermission(request, corePerm.viewDraft.name, { draftId });

        // Some permissions depend on whether the draft contains schema changes or not:
        const draft = await graph.pullOne(Draft, (d) => d.site((s) => s.id).hasSchemaChanges().hasContentChanges(), {
            key: draftId,
        });
        if (draft.site?.id !== siteId) {
            throw new api.NotFound(`Draft not found`);
        }
        if (draft.hasContentChanges) {
            await this.requirePermission(request, corePerm.applyEditsToEntries.name, { draftId });
        }
        if (draft.hasSchemaChanges) {
            await this.requirePermission(request, corePerm.applyEditsToSchema.name, { draftId });
        }
        if (!(draft.hasContentChanges) && !(draft.hasSchemaChanges)) {
            throw new api.InvalidRequest(api.InvalidRequestReason.DraftIsEmpty, "Draft is empty");
        }

        await graph.runAs(userId, AcceptDraft({ id: draftId }));

        // Response:
        return {};
    });
}
