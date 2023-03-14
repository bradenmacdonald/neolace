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
import { Site } from "neolace/core/Site.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";

export class SiteHomeResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/home"];

    GET = this.method({
        responseSchema: SDK.SiteHomePageSchema,
        description: "Get the home page content for the specified site",
    }, async ({ request }) => {
        const graph = await getGraph();
        // Permissions and parameters:
        await this.requirePermission(request, SDK.CorePerm.viewSite);
        const { siteId } = await this.getSiteDetails(request);

        const siteData = await graph.pullOne(Site, (s) => s.homePageContent, { key: siteId });
        const refCache = new ReferenceCache({ siteId });
        refCache.extractMarkdownReferences(siteData.homePageContent ?? "", { currentEntryId: undefined });

        // TODO: Retrieve the user-specific version of this content? Currently it's always anonymous
        return {
            homePageContent: siteData.homePageContent ?? "",
            referenceCache: await graph.read((tx) => refCache.getData(new LookupContext({ tx, siteId }))),
        };
    });
}
