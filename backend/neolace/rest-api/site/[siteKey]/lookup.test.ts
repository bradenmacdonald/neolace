import {
    api,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";

group("lookup.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("It can evaluate a lookup of a simple property", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const result = await client.evaluateLookupExpression(
            `this.get(prop=prop("${defaultData.schema.properties.propScientificName.key}"))`,
            { entryKey: defaultData.entries.ponderosaPine.key },
        );

        assertEquals(result.resultValue, { type: "String", value: "Pinus ponderosa" });
    });

    test("It can evaluate an AUTO relationship property and return a reference cache with details of each entry", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const expr = `this.get(prop=prop("${defaultData.schema.properties.relImages.key}"))`;
        const result = await client.evaluateLookupExpression(
            expr,
            { entryKey: defaultData.entries.ponderosaPine.key },
        );

        assertEquals(result.resultValue, {
            type: "Page",
            startedAt: 0,
            pageSize: 20,
            totalCount: 1,
            values: [
                {
                    type: "Image",
                    format: api.ImageDisplayFormat.Thumbnail,
                    entryId: defaultData.entries.imgPonderosaTrunk.id,
                    altText: defaultData.entries.imgPonderosaTrunk.name,
                    blurHash: "LCDu}B~VNu9Z0LxGNH9u$zjYWCt7",
                    contentType: "image/webp",
                    link: { type: "Entry", id: defaultData.entries.imgPonderosaTrunk.id },
                    // deno-lint-ignore no-explicit-any
                    imageUrl: (result.resultValue as any).values[0].imageUrl,
                    size: 1581898,
                    sizing: api.ImageSizingMode.Cover,
                    width: 3504,
                    height: 2336,
                },
            ],
            source: { expr, entryId: defaultData.entries.ponderosaPine.id },
        });
        assertEquals(
            result.referenceCache.entries[defaultData.entries.imgPonderosaTrunk.id]?.name,
            defaultData.entries.imgPonderosaTrunk.name,
        );
    });

    test("It gives a parse error when the expression cannot be parsed", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const err = await assertRejects(() => client.evaluateLookupExpression("this won't parse."));
        assertInstanceOf(err, api.InvalidRequest);
        assertEquals(err.reason, api.InvalidRequestReason.LookupExpressionParseError);
    });

    test("It gives an evaluation error when the expression can be parsed but is invalid", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const result = await client.evaluateLookupExpression(`date("tribble")`);
        assertEquals(result.resultValue, {
            type: "Error",
            errorClass: "LookupEvaluationError",
            message: "Date values should be in the format YYYY-MM-DD.",
        });
    });

    // TODO: test permissions, once implemented - make sure lookups can't leak any data.
});
