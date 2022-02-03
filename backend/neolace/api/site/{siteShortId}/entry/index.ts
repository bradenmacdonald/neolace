import { C, Field } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, NeolaceHttpResource, permissions } from "neolace/api/mod.ts";
import { Site, slugIdToFriendlyId } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";

export class EntryListResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/entry/"];

    GET = this.method({
        responseSchema: api.PaginatedResult(api.EntrySummarySchema),
        description: `Get a list of all entries that the current user can view, optionally filtered by type.
        This API always returns up to date information, but is fairly limited. Use the search API for more
        complex use caes, such as results sorted by name.`,
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewEntries);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        const entryTypeFilter = request.queryParam("entryType") ? C`{id: ${request.queryParam("entryType")}}` : C``;

        const baseQuery = C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType} ${entryTypeFilter})-[:${EntryType.rel.FOR_SITE}]->(site)

            WITH entry, et
        `;

        const skipParamName = "_qs"; // This parameter name is subject to change - get the URL of pages from the "nextPageUrl"
        const skip = BigInt(request.queryParam(skipParamName) ?? 0n);
        const limit = 1_000n; // Hard-coded limit for now.
        let totalCountPromise: Promise<number | undefined>;
        if (skip === 0n) {
            // On the first page [only], we calculate the total count:
            totalCountPromise = graph.read((tx) => tx.queryOne(baseQuery.RETURN({ "count(*)": Field.Int }))).then(
                (result) => {
                    return result["count(*)"];
                },
            );
        } else {
            totalCountPromise = new Promise((resolve) => {
                resolve(undefined);
            });
        }

        // For performance, we order the results by ID, not by name. Use the search index instead of this API if more
        // information or more detail is required.
        const result = await graph.read((tx) =>
            tx.query(C`
            ${baseQuery}
            RETURN entry.id AS id, entry.name AS name, entry.slugId AS slugId, et.id AS type
            ORDER BY id
            SKIP ${C(String(skip))} LIMIT ${C(String(limit + 1n))}
        `.givesShape({ "id": Field.VNID, "name": Field.String, "slugId": Field.String, "type": Field.VNID }))
        );
        const hasMore = result.length > limit; // As a simple way to check if there are more results even without knowing the total count, we retrieve 1 more than the limit, then return all results except the extra one
        const values = result.slice(0, Number(limit)).map((row) => ({
            id: row["id"],
            type: { id: row.type },
            name: row["name"],
            friendlyId: slugIdToFriendlyId(row["slugId"]),
        }));

        // Response:
        const thisUrl = new URL(request.url);
        return {
            values,
            totalCount: await totalCountPromise,
            nextPageUrl: hasMore
                ? `${thisUrl.origin}${thisUrl.pathname}?${skipParamName}=${(skip + limit)}`
                : undefined,
        };
    });
}
