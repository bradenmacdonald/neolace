import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";


export class SchemaIndexResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/schema"];

    GET = this.method({
        responseSchema: api.SiteSchemaSchema,
        description: "Get the site's schema",
    }, async () => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanViewSchema);
        const {siteId} = await this.getSiteDetails();

        // Response:
        return await graph.read(tx => getCurrentSchema(tx, siteId));
    });
}
