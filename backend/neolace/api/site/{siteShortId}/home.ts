import { NeolaceHttpResource, graph, api, permissions } from "neolace/api/mod.ts";
import { Site } from "neolace/core/Site.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";
import { CachedLookupContext } from "neolace/core/lookup/context.ts";



export class SiteHomeResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/home"];

    GET = this.method({
        responseSchema: api.SiteHomePageSchema,
        description: "Get the home page content for the specified site",
    }, async ({request}) => {
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewHomePage);
        const {siteId} = await this.getSiteDetails(request);
        
        const siteData = await graph.pullOne(Site, s => s.homePageMD, {key: siteId});
        const refCache = new ReferenceCache({siteId});
        refCache.extractMarkdownReferences(siteData.homePageMD ?? "", {currentEntryId: undefined});

        return {
            homePageMD: siteData.homePageMD ?? "",
            referenceCache: await graph.read(tx => refCache.getData(tx, new CachedLookupContext(tx, siteId, undefined))),
        };
    });
}
