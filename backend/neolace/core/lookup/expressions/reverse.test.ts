import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import {
    InlineMarkdownStringValue,
    IntegerValue,
    MakeAnnotatedEntryValue,
    NullValue,
    PageValue,
    PropertyValue,
} from "../values.ts";
import { ReverseProperty } from "./reverse.ts";
import { LookupExpression } from "../expression.ts";
import { This } from "./this.ts";
import { LiteralExpression } from "./literal-expr.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        graph.read((tx) => expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n }).then((v) => v.makeConcrete()));

    // Literal expressions referencing some properties in the default PlantDB data set:
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
        note: new InlineMarkdownStringValue(""),
        slot: new NullValue(),
    };

    group("reverse()", () => {
        test(`Can reverse a simple IS A relationship property value`, async () => {
            const expression = new ReverseProperty(new This(), { propertyExpr: partIsAPart });
            const value = await evalExpression(expression, cone);
            // A "seed cone" and a "pollen cone" are both a "cone", so we should get them
            // by reversing the "IS A" relationship on "cone"
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(pollenCone, { ...defaultAnnotations }),
                    MakeAnnotatedEntryValue(seedCone, { ...defaultAnnotations }),
                ], { pageSize: 10n, startedAt: 0n, totalCount: 2n }),
            );
        });
    });
});
