/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";
import { UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";

export class SchemaIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/schema"];

    GET = this.method({
        responseSchema: SDK.SiteSchemaSchema,
        description: "Get the site's schema",
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, SDK.CorePerm.viewSchema);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        // Response:
        return await graph.read((tx) => getCurrentSchema(tx, siteId));
    });

    PUT = this.method({
        responseSchema: SDK.schemas.Schema({}),
        requestBodySchema: SDK.SiteSchemaSchema,
        description: "Update the site's schema to match the provided schema",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = this.requireUser(request);
        await this.requirePermission(request, SDK.CorePerm.applyEditsToSchema);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        // TODO: allow specifying a Connection key and then use that connection as the edit source?
        await graph.runAs(user.id, ImportSchema({ siteId, schema: bodyData, editSource: UseSystemSource }));

        return {}; // No response
    });
}
