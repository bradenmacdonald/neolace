import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import {
    InlineMarkdownStringValue,
    IntegerValue,
    MakeAnnotatedEntryValue,
    NullValue,
    PageValue,
    PropertyValue,
    StringValue,
} from "../../values.ts";
import { GetProperty } from "./get.ts";
import { LookupExpression } from "../base.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { ReverseProperty } from "./reverse.ts";

group("get.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const evalExpression = (expr: LookupExpression, entryId?: VNID) =>
        getGraph().then((graph) =>
            graph.read((tx) =>
                expr.getValue({ tx, siteId, entryId, defaultPageSize: 10n }).then((v) => v.makeConcrete())
            )
        );

    // Literal expressions referencing some properties in the default PlantDB data set:
    const scientificName = new LiteralExpression(
        new PropertyValue(defaultData.schema.properties._propScientificName.id),
    );
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));
    const hasPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._hasPart.id));
    const genusSpecies = new LiteralExpression(new PropertyValue(defaultData.schema.properties._genusSpecies.id));
    const parentGenus = new LiteralExpression(new PropertyValue(defaultData.schema.properties._parentGenus.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
        note: new InlineMarkdownStringValue(""),
        slot: new NullValue(),
    };

    group("get() - value property, single entry, single value", () => {
        test(`get() can retrieve a property value for a single entry`, async () => {
            const expression = new GetProperty(new This(), { prop: scientificName });
            const value = await evalExpression(expression, defaultData.entries.ponderosaPine.id);

            assertEquals(value, new StringValue("Pinus ponderosa"));
        });

        test(`get() returns null if a property is not set`, async () => {
            const expression = new GetProperty(new This(), { prop: scientificName });
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

    group("get() - auto property", () => {
        test(`Can retrieve an automatically-computed reverse relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: genusSpecies });
            const value = await evalExpression(expression, defaultData.entries.genusThuja.id);
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(defaultData.entries.westernRedcedar.id, { ...defaultAnnotations }),
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 1n,
                    // Note that in this case, sourceExpression is not this.get(prop=...), but rather this.reverse(...)
                    // since that's the "real" lookup expression being used here.
                    sourceExpression: new ReverseProperty(new This(), { prop: parentGenus }),
                    sourceExpressionEntryId: defaultData.entries.genusThuja.id,
                }),
            );
        });
    });

    group("get() - relationship property", () => {
        test(`Can retrieve a simple IS A relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: partIsAPart });
            const value = await evalExpression(expression, defaultData.entries.seedCone.id);
            // A "seed cone" is a "cone":
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(cone, { ...defaultAnnotations }),
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 1n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: defaultData.entries.seedCone.id,
                }),
            );
        });

        test(`Can retrieve a simple HAS PART relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: hasPart });
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
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 2n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: defaultData.entries.classPinopsida.id,
                }),
            );
        });
    });
});
