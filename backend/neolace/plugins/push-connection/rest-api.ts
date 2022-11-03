import { api, ApplyEdits, getConnection, getGraph, NeolaceHttpResource } from "neolace/plugins/api.ts";
import { thisPlugin } from "./mod.ts";

/**
 * REST API to sync a Neolace site with an external data source, by pushing edits to this endpoint.
 *
 * This only accepts content edits, as there is already an API endpoint to sync a schema, and the Drafts API can be
 * used to propose and accept additional one-off edits to the schema. In the future we may expand this API to allow
 * schema edits if there is some use case not covered by the existing built-in APIs.
 */
export class PushEditResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/connection/push/:connectionFriendlyId/edit/"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({
            /** A single edit to apply */
            edit: api.CreateEditSchema,
        }),
        responseSchema: api.schemas.Schema({
            appliedEditId: api.schemas.nullable(api.schemas.vnidString),
        }),
        description: "Push entry data into a Neolace site",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = await this.requireUser(request);
        await this.requirePermission(request, [
            api.CorePerm.applyEditsToEntries,
            api.CorePerm.proposeEditToEntry,
            api.CorePerm.proposeNewEntry,
        ]);
        const { siteId } = await this.getSiteDetails(request);
        if (!(await thisPlugin.isEnabledForSite(siteId))) {
            throw new api.NotFound("Push connection is not enabled for that site");
        }
        const friendlyId = request.pathParam("connectionFriendlyId");
        if (typeof friendlyId !== "string") {
            throw new api.InvalidFieldValue([{ fieldPath: "friendlyId", message: "friendly ID missing/invalid." }]);
        }
        const connection = await getConnection({
            create: request.queryParam("create") !== undefined,
            friendlyId,
            plugin: "push-connection",
            siteId,
        });

        // Validate the edit
        const editType = api.getEditType(bodyData.edit.code);
        if (editType.changeType !== api.EditChangeType.Content) {
            throw new api.InvalidFieldValue([{
                fieldPath: "edit.code",
                message: "Only content edits can be used with the Push connection REST API.",
            }]);
        }
        editType.dataSchema(bodyData.edit.data); // This does the validation.

        const graph = await getGraph();
        const result = await graph.runAs(
            user.id,
            ApplyEdits({
                siteId,
                editSource: connection.id,
                edits: [bodyData.edit],
            }),
        );

        // Response:
        return {
            // If the edit made changes, this will return the ID of the appliedEdit object. Otherwise, it will return
            // null to indicate that the edit was a no-op (e.g. changing an entry's name to the name it already has)
            appliedEditId: result.appliedEditIds.length === 1 ? result.appliedEditIds[0] : null,
        };
    });
}
