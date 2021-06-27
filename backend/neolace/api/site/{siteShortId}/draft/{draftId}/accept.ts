import { VNID } from "neolace/deps/vertex-framework.ts";
import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { AcceptDraft, Draft } from "neolace/core/edit/Draft.ts";


export class AcceptDraftResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/draft/:draftId/accept"];

    POST = this.method({
        responseSchema: api.schemas.Schema({}),
        description: "Accept a draft",
    }, async () => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanViewDrafts);
        const userId = this.requireUser().id;
        const {siteId} = await this.getSiteDetails();
        const draftId = VNID(this.request.getPathParam("draftId") ?? "");

        // Some permissions depend on whether the draft contains schema changes or not:
        const draft = await graph.pullOne(Draft, d => d.site(s => s.id).hasSchemaChanges().hasContentChanges())
        if (draft.site?.id !== siteId) {
            throw new api.NotFound(`Draft not found`);
        }
        if (draft.hasContentChanges) {
            await this.requirePermission(permissions.CanApproveEntryEdits);
        }
        if (draft.hasSchemaChanges) {
            await this.requirePermission(permissions.CanApproveSchemaChanges);
        }
        if (!(draft.hasContentChanges) && !(draft.hasSchemaChanges)) {
            throw new api.InvalidRequest(api.InvalidRequestReason.DraftIsEmpty, "Draft is emptyy");
        }

        await graph.runAs(userId, AcceptDraft({id: draftId, }));

        // Response:
        return {};
    });
}
