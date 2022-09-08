import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";
import { ImportSchema } from "neolace/core/schema/import-schema.ts";

export class SchemaIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/schema"];

    GET = this.method({
        responseSchema: api.SiteSchemaSchema,
        description: "Get the site's schema",
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, api.CorePerm.viewSchema);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        // Response:
        return await graph.read((tx) => getCurrentSchema(tx, siteId));
    });

    PUT = this.method({
        responseSchema: api.schemas.Schema({}),
        requestBodySchema: api.SiteSchemaSchema,
        description: "Update the site's schema to match the provided schema",
    }, async ({ request, bodyData }) => {
        // Permissions and parameters:
        const user = this.requireUser(request);
        await this.requirePermission(request, api.CorePerm.applyEditsToSchema);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        await graph.runAs(user.id, ImportSchema({ siteId, schema: bodyData }));

        return {}; // No response
    });
}
