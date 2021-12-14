import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { getCurrentSchema } from "neolace/core/schema/get-schema.ts";


export class SchemaIndexResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/schema"];

    GET = this.method({
        responseSchema: api.SiteSchemaSchema,
        description: "Get the site's schema",
    }, async ({request}) => {
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewSchema);
        const {siteId} = await this.getSiteDetails(request);

        // Response:
        return await graph.read(tx => getCurrentSchema(tx, siteId));
    });
}
