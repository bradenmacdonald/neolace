import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { NeolaceHttpResource, graph, api } from "neolace/api/mod.ts";
import { Site } from "neolace/core/Site.ts";


export class SiteLookupResource extends NeolaceHttpResource {
    static paths = ["/site/lookup"];

    GET = this.method({
        responseSchema: api.SiteDetailsSchema,
        description: "Lookup a site by domain name.",
    }, async () => {
        // Permissions and parameters:
        const domain = this.request.getUrlQueryParam("domain");
        if (domain === null) {
            throw new api.InvalidFieldValue([{fieldPath: "domain", message: "domain lookup is missing. Specify ?domain=... to look up a site by domain."}]);
        }
        // The *Name*, *URL*, and basic information about a site is available to anyone who knows the URL of the site
        // (knows its domain).

        // Load the site or throw a 404 error:
        const site = await graph.pullOne(Site, s => s.name.description.domain.footerMD.shortId(), {where: C`@this.domain = ${domain}`}).catch((err) => {
            if (err instanceof EmptyResultError) {
                throw new api.NotFound(`Site with domain "${domain}" not found.`);
            } else {
                throw err;
            }
        });

        if (domain !== site.domain) {
            throw new api.ApiError("Internal error - domain mismatch.", 500);
        }

        // Response:
        return site;
    });
}
