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
    StringValue,
} from "../values.ts";
import { GetProperty } from "./get.ts";
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
    const scientificName = new LiteralExpression(
        new PropertyValue(defaultData.schema.properties._propScientificName.id),
    );
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));
    const hasPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._hasPart.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
        note: new InlineMarkdownStringValue(""),
        slot: new NullValue(),
    };

    group("get() - value property, single entry, single value", () => {
        test(`get() can retrieve a property value for a single entry`, async () => {
            const expression = new GetProperty(new This(), { propertyExpr: scientificName });
            const value = await evalExpression(expression, defaultData.entries.ponderosaPine.id);

            assertEquals(value, new StringValue("Pinus ponderosa"));
        });

        test(`get() returns null if a property is not set`, async () => {
            const expression = new GetProperty(new This(), { propertyExpr: scientificName });
            // The entry "cone" doesn't have a scientific name set:
            const value = await evalExpression(expression, defaultData.entries.cone.id);

            assertEquals(value, new NullValue());
        });
    });

    group("get() - value property, single entry, multiple values", () => {
        // TODO
    });

    group("get() - value property, multiple entries", () => {
        // TODO
    });

    group("get() - relationship property", () => {
        test(`Can retrieve a simple IS A relationship property value`, async () => {
            const expression = new GetProperty(new This(), { propertyExpr: partIsAPart });
            const value = await evalExpression(expression, defaultData.entries.seedCone.id);
            // A "seed cone" is a "cone":
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(cone, { ...defaultAnnotations }),
                ], { pageSize: 10n, startedAt: 0n, totalCount: 1n }),
            );
        });

        test(`Can retrieve a simple HAS PART relationship property value`, async () => {
            const expression = new GetProperty(new This(), { propertyExpr: hasPart });
            const value = await evalExpression(expression, defaultData.entries.classPinopsida.id);
            // All conifers (Class Pinopsida) have both male and female cones:
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(pollenCone, {
                        ...defaultAnnotations,
                        slot: new StringValue("pollen-cone"),
                    }),
                    MakeAnnotatedEntryValue(seedCone, {
                        ...defaultAnnotations,
                        slot: new StringValue("seed-cone"),
                        rank: new IntegerValue(2n),
                    }),
                ], { pageSize: 10n, startedAt: 0n, totalCount: 2n }),
            );
        });
    });
});
