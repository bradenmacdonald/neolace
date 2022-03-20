import { api, getGraph, NeolaceHttpResource, permissions } from "neolace/api/mod.ts";
import { CachedLookupContext } from "neolace/core/lookup/context.ts";
import { parseLookupString } from "neolace/core/lookup/parse.ts";
import { LookupParseError } from "neolace/core/lookup/errors.ts";
import { LookupExpression } from "neolace/core/lookup/expression.ts";
import { getEntry } from "./entry/{entryId}/_helpers.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

export class EvaluateLookupResource extends NeolaceHttpResource {
    public paths = ["/site/:siteShortId/lookup"];

    GET = this.method({
        responseSchema: api.EvaluateLookupSchema,
        description: "Evaluate a lookup expression and return the result",
    }, async ({ request }) => {
        // Permissions and parameters:
        await this.requirePermission(request, permissions.CanViewEntries);
        const { siteId } = await this.getSiteDetails(request);
        const graph = await getGraph();

        const lookupString = request.queryParam("expression");
        if (!lookupString || lookupString.trim() === "") {
            throw new api.InvalidFieldValue([{
                fieldPath: `expression`,
                message: `Missing or empty lookup string`,
            }]);
        }

        // Determine the entry that will be the 'this' value in the expression, if any.
        const entryKeyStr = request.queryParam("entryKey");
        let entry: { id: VNID } | undefined;
        if (entryKeyStr) {
            entry = await graph.read((tx) => getEntry(entryKeyStr, siteId, tx));
        }

        // Parse the expression
        let parsedExpression: LookupExpression;
        try {
            parsedExpression = parseLookupString(lookupString);
        } catch (err) {
            if (err instanceof LookupParseError) {
                throw new api.InvalidRequest(api.InvalidRequestReason.LookupExpressionParseError, err.message);
            }
            throw err;
        }

        const resultValue = await graph.read(async (tx) => {
            const defaultPageSize = 20n;
            const context = new CachedLookupContext(tx, siteId, entry?.id, defaultPageSize);
            // Evaluate the expression. On LookupEvaluationError, this will return an ErrorValue.
            const value = await context.evaluateExpr(parsedExpression);
            // TODO: set a timeout to rollback/abort the transaction if it's taking too long.
            return (await value.makeConcrete()).toJSON();
        });

        return {
            expressionNormalized: parsedExpression.toString(),
            resultValue,
        };
    });
}
