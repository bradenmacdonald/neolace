import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import {
    InlineMarkdownStringValue,
    IntegerValue,
    MakeAnnotatedEntryValue,
    NullValue,
    PageValue,
    PropertyValue,
} from "../../values.ts";
import { ReverseProperty } from "./reverse.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";

group("reverse.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const context = new TestLookupContext({ siteId });

    // Literal expressions referencing some properties in the default PlantDB data set:
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
        note: new InlineMarkdownStringValue(""),
        slot: new NullValue(),
    };

    test(`Can reverse a simple IS A relationship property value`, async () => {
        const expression = new ReverseProperty(new This(), { prop: partIsAPart });
        const value = await context.evaluateExprConcrete(expression, cone);
        // A "seed cone" and a "pollen cone" are both a "cone", so we should get them
        // by reversing the "IS A" relationship on "cone"
        assertEquals(
            value,
            new PageValue([
                MakeAnnotatedEntryValue(pollenCone, { ...defaultAnnotations }),
                MakeAnnotatedEntryValue(seedCone, { ...defaultAnnotations }),
            ], {
                pageSize: 10n,
                startedAt: 0n,
                totalCount: 2n,
                sourceExpression: expression,
                sourceExpressionEntryId: cone,
            }),
        );
    });
});
