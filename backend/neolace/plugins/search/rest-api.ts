/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */
import { api, NeolaceHttpResource, realmConfig } from "neolace/plugins/api.ts";
import { thisPlugin } from "./mod.ts";
import { getSiteCollectionAlias, getSiteSpecificApiKey } from "./site-collection.ts";
import { getTypeSenseClient } from "./typesense-client.ts";

const ONE_HOUR = 60 * 60; // Number of seconds in an hour

/**
 * Give the API client (e.g. the frontend) the URL of the TypeSense search API, as well as an API key that will allow
 * them to search for content directly.
 */
export class SearchConnectionResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/search/connection"];

    GET = this.method({
        responseSchema: api.SiteSearchConnectionSchema,
        description: "Get connection details for the site's search API endpoint (TypeSense)",
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, api.CorePerm.viewSite);
        const { siteId } = await this.getSiteDetails(request);
        if (!(await thisPlugin.isEnabledForSite(siteId))) {
            throw new api.NotFound("Search is not enabled for that site");
        }
        const [client, siteEntriesCollection, siteSearchkey] = await Promise.all([
            getTypeSenseClient(),
            getSiteCollectionAlias(siteId),
            // Retrieve the site-specific API key from the graph, or generate a new one if required.
            getSiteSpecificApiKey(siteId),
        ]);
        // Now generate an even more restricted key that can only search for entries that the current user's groups are
        // allowed to see
        const restrictedApiKey = await client.keys().generateScopedSearchKey(siteSearchkey, {
            // https://typesense.org/docs/0.22.1/api/api-keys.html#generate-scoped-search-key
            //filter_by: "viewable_by_groups:=[sales,marketing]",
            // This key will expire in one hour
            expires_at: Math.floor(Date.now() / 1000) + ONE_HOUR,
        });

        // Response:
        return {
            // searchEndpoint: `${realmConfig.typeSenseProtocol}://${realmConfig.typeSenseHost}:${realmConfig.typeSensePort}`,
            searchEndpoint: realmConfig.typeSensePublicEndpoint,
            siteEntriesCollection,
            apiKey: restrictedApiKey,
        };
    });
}
