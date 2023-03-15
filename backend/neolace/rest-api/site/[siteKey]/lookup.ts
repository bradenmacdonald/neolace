/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { LookupContext } from "neolace/core/lookup/context.ts";
import { getEntry } from "./entry/[entryId]/_helpers.ts";
import { ReferenceCache } from "neolace/core/entry/reference-cache.ts";
import { ErrorValue } from "neolace/core/lookup/values.ts";
import { LookupParseError } from "neolace/core/lookup/errors.ts";

export class EvaluateLookupResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/lookup"];

    GET = this.method({
        responseSchema: SDK.EvaluateLookupSchema,
        description: "Evaluate a lookup expression and return the result",
    }, async ({ request }) => {
        // Permissions and parameters:
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        const lookupString = request.queryParam("expression");
        if (!lookupString || lookupString.trim() === "") {
            throw new SDK.InvalidFieldValue([{
                fieldPath: `expression`,
                message: `Missing or empty lookup string`,
            }]);
        }

        let defaultPageSize = 20n;
        const pageSizeParam = request.queryParam("pageSize");
        if (pageSizeParam) {
            try {
                defaultPageSize = BigInt(pageSizeParam);
            } catch (_err: unknown) {
                throw new SDK.InvalidFieldValue([{ fieldPath: "pageSize", message: "Invalid page size." }]);
            }
            if (defaultPageSize < 1n || defaultPageSize > 100n) {
                defaultPageSize = 20n;
            }
        }

        // Determine the entry that will be the 'this' value in the expression, if any.
        const entryKeyStr = request.queryParam("entryKey");
        let entry: { id: VNID; entryType: { key: string } } | undefined;
        if (entryKeyStr) {
            entry = await graph.read((tx) => getEntry(entryKeyStr, siteId, request.user?.id, tx));
        }

        // Check permissions:
        if (entry) {
            await this.requirePermission(request, SDK.CorePerm.viewEntry, {
                entryId: entry.id,
                entryTypeKey: entry.entryType.key,
            });
        } else {
            await this.requirePermission(request, SDK.CorePerm.viewSite);
        }

        const userId = request.user?.id;
        const { resultValue, refCacheData } = await graph.read(async (tx) => {
            const context = new LookupContext({ tx, siteId, userId, entryId: entry?.id, defaultPageSize });
            // Evaluate the expression. On LookupEvaluationError, this will return an ErrorValue.
            const value = await context.evaluateExpr(lookupString);
            if (value instanceof ErrorValue && value.error instanceof LookupParseError) {
                throw new SDK.InvalidRequest(
                    SDK.InvalidRequestReason.LookupExpressionParseError,
                    value.error.message,
                );
            }
            // TODO: set a timeout to rollback/abort the transaction if it's taking too long.
            const resultValue = (await value.makeConcrete()).toJSON();

            const refCache = new ReferenceCache({ siteId });
            refCache.extractLookupReferences(resultValue, { currentEntryId: entry?.id });
            const refCacheData = await refCache.getData(context);

            return { resultValue, refCacheData };
        });

        return {
            resultValue,
            referenceCache: refCacheData,
        };
    });
}
