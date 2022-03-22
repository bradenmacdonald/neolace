import {
    api,
    assert,
    assertEquals,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("It can evaluate a lookup of a simple property", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        const result = await client.evaluateLookupExpression(
            `this.get(prop=[[/prop/${defaultData.schema.properties._propScientificName.id}]])`,
            { entryKey: defaultData.entries.ponderosaPine.friendlyId },
        );

        assertEquals(result.resultValue, { type: "String", value: "Pinus ponderosa" });
        assertEquals(
            result.expressionNormalized,
            `get(this, prop=[[/prop/${defaultData.schema.properties._propScientificName.id}]])`,
        );
    });

    test("It can evaluate an AUTO relationship property and return a reference cache with details of each entry", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        const result = await client.evaluateLookupExpression(
            `this.get(prop=[[/prop/${defaultData.schema.properties._relImages.id}]])`,
            { entryKey: defaultData.entries.ponderosaPine.friendlyId },
        );

        assertEquals(result.resultValue, {
            type: "Page",
            startedAt: 0,
            pageSize: 20,
            totalCount: 1,
            values: [
                {
                    type: "Annotated",
                    annotations: {
                        note: { type: "InlineMarkdownString", value: "" },
                        rank: { type: "Integer", value: "1" },
                        slot: { type: "Null" },
                    },
                    value: { type: "Entry", id: defaultData.entries.imgPonderosaTrunk.id },
                },
            ],
            source: {
                expr: `reverse(andDescendants(this), prop=[[/prop/${defaultData.schema.properties._imgRelTo.id}]])`,
                entryId: defaultData.entries.ponderosaPine.id,
            },
        });
        assertEquals(
            result.expressionNormalized,
            `get(this, prop=[[/prop/${defaultData.schema.properties._relImages.id}]])`,
        );
        assertEquals(
            result.referenceCache.entries[defaultData.entries.imgPonderosaTrunk.id]?.name,
            defaultData.entries.imgPonderosaTrunk.name,
        );
    });

    test("It gives a parse error when the expression cannot be parsed", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        await assertRejects(async () => {
            await client.evaluateLookupExpression("this won't parse.");
        }, (err: unknown) => {
            assert(err instanceof api.InvalidRequest);
            assertEquals(err.reason, api.InvalidRequestReason.LookupExpressionParseError);
        });
    });

    test("It gives an evaluation error when the expression can be parsed but is invalid", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        const result = await client.evaluateLookupExpression(`date("tribble")`);
        assertEquals(result.resultValue, {
            type: "Error",
            errorClass: "LookupEvaluationError",
            message: "Date values should be in the format YYYY-MM-DD.",
        });
        assertEquals(result.expressionNormalized, `date("tribble")`);
    });

    // TODO: test permissions, once implemented - make sure lookups can't leak any data.
});
