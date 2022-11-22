import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { Site } from "neolace/core/Site.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";

export class SiteHomeResource extends NeolaceHttpResource {
    public paths = ["/site/:siteFriendlyId/home"];

    GET = this.method({
        responseSchema: api.SiteHomePageSchema,
        description: "Get the home page content for the specified site",
    }, async ({ request }) => {
        const graph = await getGraph();
        // Permissions and parameters:
        await this.requirePermission(request, api.CorePerm.viewSite);
        const { siteId } = await this.getSiteDetails(request);

        const siteData = await graph.pullOne(Site, (s) => s.homePageContent, { key: siteId });
        const refCache = new ReferenceCache({ siteId });
        refCache.extractMarkdownReferences(siteData.homePageContent ?? "", { currentEntryId: undefined });

        return {
            homePageContent: siteData.homePageContent ?? "",
            referenceCache: await graph.read((tx) => refCache.getData(new LookupContext({ tx, siteId }))),
        };
    });
}
