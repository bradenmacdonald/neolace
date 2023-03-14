import { getConnection, getGraph, NeolaceHttpResource, SDK } from "neolace/plugins/api.ts";
import { ApplyBulkEdits } from "neolace/core/edit/ApplyBulkEdits.ts";
import { FieldValidationError } from "neolace/deps/vertex-framework.ts";
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
        requestBodySchema: SDK.schemas.Schema({
            /** A single edit to apply */
            edits: SDK.schemas.array.of(SDK.BulkEditSchema),
        }),
        responseSchema: SDK.schemas.Schema({
            appliedEditIds: SDK.schemas.array.of(SDK.schemas.vnidString),
        }),
        description: "Push entry data into a Neolace site",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = await this.requireUser(request);
        await this.requirePermission(request, [
            SDK.CorePerm.applyEditsToEntries,
            SDK.CorePerm.proposeEditToEntry,
            SDK.CorePerm.proposeNewEntry,
        ]);
        const { siteId } = await this.getSiteDetails(request);
        if (!(await thisPlugin.isEnabledForSite(siteId))) {
            throw new SDK.NotFound("Push connection is not enabled for that site");
        }
        const key = request.pathParam("connectionKey");
        if (typeof key !== "string") {
            throw new SDK.InvalidFieldValue([{
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
                throw new SDK.NotFound(err.message);
            }
            throw err;
        }

        // Validate the edits
        for (const edit of bodyData.edits) {
            const editType = SDK.getEditType(edit.code);
            if (editType.changeType !== SDK.EditChangeType.Bulk) {
                throw new SDK.InvalidFieldValue([{
                    fieldPath: "edit.code",
                    message: "Only bulk edits can be used with the Push connection REST API.",
                }]);
            }
            editType.dataSchema(edit.data); // This does the validation.
        }

        const graph = await getGraph();
        let result;
        try {
            result = await graph.runAs(
                user.id,
                ApplyBulkEdits({
                    siteId,
                    connectionId: connection.id,
                    edits: bodyData.edits,
                }),
            );
        } catch (err) {
            if (err instanceof Error && err.cause instanceof SDK.InvalidEdit) {
                throw err.cause;
            } else if (err instanceof Error && err.cause instanceof FieldValidationError) {
                throw new SDK.InvalidFieldValue([{
                    fieldPath: `edits.*.${err.cause.field}`,
                    message: err.cause.message,
                }]);
            } else if (err instanceof FieldValidationError) {
                throw new SDK.InvalidFieldValue([{
                    fieldPath: `edits.*.${err.field}`,
                    message: err.message,
                }]);
            }
            throw err;
        }

        // Response:
        return {
            appliedEditIds: result.appliedEditIds,
        };
    });
}
