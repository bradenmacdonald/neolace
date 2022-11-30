import { api, getConnection, getGraph, NeolaceHttpResource } from "neolace/plugins/api.ts";
import { ApplyBulkEdits } from "../../core/edit/ApplyBulkEdits.ts";
import { thisPlugin } from "./mod.ts";

/**
 * REST API to sync a Neolace site with an external data source, by pushing edits to this endpoint.
 *
 * This only accepts content edits, as there is already an API endpoint to sync a schema, and the Drafts API can be
 * used to propose and accept additional one-off edits to the schema. In the future we may expand this API to allow
 * schema edits if there is some use case not covered by the existing built-in APIs.
 */
export class PushEditResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/connection/push/:connectionKey/edit/"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({
            /** A single edit to apply */
            edits: api.schemas.array.of(api.BulkEditSchema),
        }),
        responseSchema: api.schemas.Schema({
            appliedEditIds: api.schemas.array.of(api.schemas.vnidString),
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
        const key = request.pathParam("connectionKey");
        if (typeof key !== "string") {
            throw new api.InvalidFieldValue([{
                fieldPath: "connectionKey",
                message: "Connection key missing/invalid.",
            }]);
        }
        let connection;
        try {
            connection = await getConnection({
                create: request.queryParam("create") !== undefined,
                key,
                plugin: "push-connection",
                siteId,
            });
        } catch (err) {
            if (err instanceof Error && err.message.includes("not found")) {
                throw new api.NotFound(err.message);
            }
            throw err;
        }

        // Validate the edits
        for (const edit of bodyData.edits) {
            const editType = api.getEditType(edit.code);
            if (editType.changeType !== api.EditChangeType.Bulk) {
                throw new api.InvalidFieldValue([{
                    fieldPath: "edit.code",
                    message: "Only bulk edits can be used with the Push connection REST API.",
                }]);
            }
            editType.dataSchema(edit.data); // This does the validation.
        }

        const graph = await getGraph();
        const result = await graph.runAs(
            user.id,
            ApplyBulkEdits({
                siteId,
                connectionId: connection.id,
                edits: bodyData.edits,
            }),
        );

        // Response:
        return {
            appliedEditIds: result.appliedEditIds,
        };
    });
}
