import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { Site } from "neolace/core/Site.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";



export class SiteHomeResource extends NeolaceHttpResource {
    static paths = ["/site/:siteShortId/home"];

    GET = this.method({
        responseSchema: api.SiteHomePageSchema,
        description: "Get the home page content for the specified site",
    }, async () => {
        // Permissions and parameters:
        await this.requirePermission(permissions.CanViewHomePage);
        const {siteId} = await this.getSiteDetails();
        
        const siteData = await graph.pullOne(Site, s => s.homePageMD, {key: siteId});
        const refCache = new ReferenceCache({siteId});
        refCache.extractMarkdownReferences(siteData.homePageMD ?? "");

        return {
            homePageMD: siteData.homePageMD ?? "",
            referenceCache: await graph.read(tx => refCache.getData(tx)),
        };
    });
}
