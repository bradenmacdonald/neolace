import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { Site } from "neolace/core/Site.ts";
import { CanViewHomePage } from "../../core/permissions.ts";

export class SiteFindByDomainResource extends NeolaceHttpResource {
    public paths = ["/site/find"];

    GET = this.method({
        responseSchema: api.SiteDetailsSchema,
        description: "Get a site by domain name.",
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
        const site = await graph.pullOne(Site, (s) => s.name.description.domain.footerMD.shortId().frontendConfig(), {
            where: C`@this.domain = ${domain}`,
        }).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new api.NotFound(`Site with domain "${domain}" not found.`);
            } else {
                throw err;
            }
        });

        if (domain !== site.domain) {
            throw new api.ApiError("Internal error - domain mismatch.", 500);
        }

        if (!this.hasPermission(request, CanViewHomePage)) {
            // If the user doesn't have permission to view the site, they're not allowed to see the footer or frontend config:
            site.footerMD = "";
            site.frontendConfig = {};
        }

        // Response:
        return site;
    });
}
