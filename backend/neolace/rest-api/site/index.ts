// import { C, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { api, NeolaceHttpResource } from "neolace/rest-api/mod.ts";
// import { getHomeSite, Site } from "neolace/core/Site.ts";

export class SitesResource extends NeolaceHttpResource {
    public paths = ["/site"];

    POST = this.method({
        responseSchema: api.SiteDetailsSchema,
        description: "Create a new site",
    }, async () => {
        throw new Error("Creating a site via the API is not yet implemented.");
    });
}
