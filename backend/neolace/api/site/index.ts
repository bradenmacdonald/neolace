import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { api, corePerm, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getHomeSite, Site } from "neolace/core/Site.ts";

export class SitesResource extends NeolaceHttpResource {
    public paths = ["/site"];

    POST = this.method({
        responseSchema: api.SiteDetailsSchema,
        description: "Create a new site",
    }, async ({ request }) => {
        // Permissions and parameters:
        const domain = request.queryParam("domain");
        if (domain === undefined) {
            throw new api.InvalidFieldValue([{
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
            (s) => s.name.description.domain.url().footerMD.shortId().frontendConfig(),
            {
                where: C`@this.domain = ${domain}`,
            },
        ).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new api.NotFound(`Site with domain "${domain}" not found.`);
            } else {
                throw err;
            }
        });

        if (domain !== site.domain) {
            throw new api.ApiError("Internal error - domain mismatch.", 500);
        }

        if (!this.hasPermission(request, corePerm.viewSite.name, {})) {
            // If the user doesn't have permission to view the site, they're not allowed to see the footer or frontend config:
            site.footerMD = "";
            site.frontendConfig = {};
        }

        const homeSite = await getHomeSite();

        // Response:
        return {
            ...site,
            isHomeSite: site.shortId === homeSite.shortId,
            homeSiteName: homeSite.name,
            homeSiteUrl: homeSite.url,
        };
    });
}