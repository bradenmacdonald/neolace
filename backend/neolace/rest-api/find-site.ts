/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { getHomeSite, Site } from "neolace/core/Site.ts";

export class SiteFindByDomainResource extends NeolaceHttpResource {
    public paths = ["/find-site"];

    GET = this.method({
        responseSchema: SDK.SiteDetailsSchema,
        description: "Get a site by domain name.",
    }, async ({ request }) => {
        // Permissions and parameters:
        const domain = request.queryParam("domain");
        if (domain === undefined) {
            throw new SDK.InvalidFieldValue([{
                fieldPath: "domain",
                message: "domain lookup is missing. Specify ?domain=... to look up a site by domain.",
            }]);
        }
        // The *Name*, *URL*, and basic information about a site is available to anyone who knows the URL of the site
        // (knows its domain).

        // Load the site or throw a 404 error:
        const graph = await getGraph();
        const site = await graph.pullOne(
            Site,
            (s) => s.name.description.domain.url().footerContent.key.frontendConfig,
            { with: { domain } },
        ).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new SDK.NotFound(`Site with domain "${domain}" not found.`);
            } else {
                throw err;
            }
        });

        if (domain !== site.domain) {
            throw new SDK.ApiError("Internal error - domain mismatch.", 500);
        }

        if (!this.hasPermission(request, SDK.CorePerm.viewSite, {})) {
            // If the user doesn't have permission to view the site, they're not allowed to see the footer or frontend config:
            site.footerContent = "";
            site.frontendConfig = {};
        }

        const homeSite = await getHomeSite();

        // Response:
        return {
            ...site,
            isHomeSite: site.key === homeSite.key,
            homeSiteName: homeSite.name,
            homeSiteUrl: homeSite.url,
        };
    });
}
