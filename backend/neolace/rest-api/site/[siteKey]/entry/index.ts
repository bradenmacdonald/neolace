/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { log } from "neolace/app/log.ts";
import { C, Field } from "neolace/deps/vertex-framework.ts";
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { Site, siteKeyFromId } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { makeCypherCondition } from "neolace/core/permissions/check.ts";
import { Property, PropertyFact } from "neolace/core/mod.ts";

export class EntryListResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/entry/"];

    GET = this.method({
        responseSchema: SDK.schemas.StreamedResult(SDK.EntrySummarySchema),
        description: `Get a list of all entries that the current user can view, optionally filtered by type.
        This API always returns up to date information, but is fairly limited. Use the search API for more
        complex use cases, such as results sorted by name.`,
    }, async ({ request }) => {
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        const onlyEntryType = request.queryParam("entryType") as string | undefined;
        const entryTypeFilter = onlyEntryType ? C`{siteNamespace: ${siteId}, key: ${onlyEntryType}}` : C``;
        const subject = await this.getPermissionSubject(request);
        const permissionsFilter = await makeCypherCondition(subject, SDK.CorePerm.viewEntry, {
            entryTypeKey: onlyEntryType,
        }, ["entry", "entryType"]);

        const baseQuery = C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType} ${entryTypeFilter})-[:${EntryType.rel.FOR_SITE}]->(site)

            WHERE ${permissionsFilter}
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
            RETURN entry.id AS id, entry.name AS name, entry.key AS key, entryType.key AS entryTypeKey
            ORDER BY id
            SKIP ${C(String(skip))} LIMIT ${C(String(limit + 1n))}
        `.givesShape({ "id": Field.VNID, "name": Field.String, "key": Field.String, "entryTypeKey": Field.String }))
        );
        const hasMore = result.length > limit; // As a simple way to check if there are more results even without knowing the total count, we retrieve 1 more than the limit, then return all results except the extra one
        const values = result.slice(0, Number(limit)).map((row) => ({
            id: row.id,
            entryType: { key: row.entryTypeKey },
            name: row.name,
            key: row.key,
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

    DELETE = this.method({
        responseSchema: SDK.schemas.Schema({}),
        description: `
            Erase all of this site's entries/content. This is dangerous and destructive. Only system administrators
            may use this API method. You must pass ?confirm=danger for this method to succeed.`,
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, "DANGER!!" as SDK.PermissionName); // Only a user with the "*" global permission grant will match this
        const { siteId } = await this.getSiteDetails(request);
        const siteKey = await siteKeyFromId(siteId);
        const graph = await getGraph();

        if (request.queryParam("confirm") !== "danger") {
            throw new SDK.InvalidRequest(
                SDK.InvalidRequestReason.OtherReason,
                "You must specify ?confirm=danger to erase all entries.",
            );
        }

        log.warning(`Irreversibly deleting all entries from site ${siteKey}`);

        // This doesn't use an Action because we can't handle high volume deletions within a single action.
        // We need to use CALL { ... } IN TRANSACTIONS, which requires using auto-commit mode, which is different from
        // the write transactions used for Vertex Framework actions.
        await graph._restrictedAllowWritesWithoutAction(async () => {
            const deletePropertyFacts = C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(prop)-[:${Property.rel.FOR_SITE}]->(site)
                CALL {
                    WITH pf
                    DETACH DELETE pf
                } IN TRANSACTIONS OF 200 ROWS
            `;
            const deleteEntryFeatures = C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]-(et)-[:FOR_SITE]->(site)
                MATCH (entry)-[:${Entry.rel.HAS_FEATURE_DATA}]->(ef)
                CALL {
                    WITH ef
                    DETACH DELETE ef
                } IN TRANSACTIONS OF 200 ROWS
            `;
            const deleteSlugIds = C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (slug:SlugId)-[:IDENTIFIES]->(entry:${Entry})
                    WHERE exists ( (entry)-[:${Entry.rel.IS_OF_TYPE}]-(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site) )
                CALL {
                    WITH slug
                    DETACH DELETE slug
                } IN TRANSACTIONS OF 200 ROWS
            `;
            const deleteEntries = C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (entry:${Entry})
                    WHERE exists ( (entry)-[:${Entry.rel.IS_OF_TYPE}]-(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site) )
                CALL {
                    WITH entry
                    DETACH DELETE entry
                } IN TRANSACTIONS OF 50 ROWS
            `;
            // Do the deletion in autocommit transactions:
            log.info(`Deletion part 1/4 - deleting property facts from ${siteKey}...`);
            await graph._restrictedWrite({
                text: deletePropertyFacts.queryString,
                parameters: deletePropertyFacts.params,
            });
            log.info(`Deletion part 2/4 - deleting entry features from ${siteKey}...`);
            await graph._restrictedWrite({
                text: deleteEntryFeatures.queryString,
                parameters: deleteEntryFeatures.params,
            });
            log.info(`Deletion part 3/4 - deleting slug IDs from ${siteKey}...`);
            await graph._restrictedWrite({
                text: deleteSlugIds.queryString,
                parameters: deleteSlugIds.params,
            });
            log.info(`Deletion part 4/4 - deleting entries from ${siteKey}...`);
            await graph._restrictedWrite({
                text: deleteEntries.queryString,
                parameters: deleteEntries.params,
            });
            log.info(`Deleted all entries from site ${siteKey}.`);
        });
        return {};
    });
}
