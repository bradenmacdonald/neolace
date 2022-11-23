import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { WithDetail } from "./withDetail.ts";
import { AnnotatedValue, EntryValue, PageValue, PropertyValue, StringValue } from "../../values.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { List } from "../list-expr.ts";

group("withDetails()", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const jackPine = defaultData.entries.jackPine;
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id, defaultPageSize: 15n });

    const scientificNameProp = new LiteralExpression(
        new PropertyValue(defaultData.schema.properties.propScientificName.key),
    );

    test("It can annotate set of entries with details coming from a property value", async () => {
        // this is the same as this.andRelated(depth=1)
        const expression = new WithDetail(
            new List([
                new LiteralExpression(new EntryValue(ponderosaPine.id)),
                new LiteralExpression(new EntryValue(jackPine.id)),
            ]),
            { prop: scientificNameProp },
        );
        const value = await context.evaluateExprConcrete(expression);

        assertEquals(
            value,
            new PageValue(
                [
                    new AnnotatedValue(new EntryValue(ponderosaPine.id), {
                        detail: new StringValue("Pinus ponderosa"),
                    }),
                    new AnnotatedValue(new EntryValue(jackPine.id), { detail: new StringValue("Pinus banksiana") }),
                ],
                {
                    pageSize: 15n,
                    startedAt: 0n,
                    totalCount: 2n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: ponderosaPine.id,
                },
            ),
        );
    });

    test("It can annotate a single entry with a detail coming from a property value", async () => {
        // this is the same as this.andRelated(depth=1)
        const expression = new WithDetail(new This(), { prop: scientificNameProp });
        const value = await context.evaluateExprConcrete(expression);

        assertEquals(
            value,
            new AnnotatedValue(new EntryValue(ponderosaPine.id), { detail: new StringValue("Pinus ponderosa") }),
        );
    });
});
