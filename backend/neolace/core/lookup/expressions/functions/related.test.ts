import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AndRelated } from "./related.ts";
import { AnnotatedValue, EntryValue, IntegerValue, PageValue } from "../../values.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";

group("andRelated()", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;

    const one = new LiteralExpression(new IntegerValue(1));
    const two = new LiteralExpression(new IntegerValue(2));

    test("It can find all entries related to the ponderosa pine (depth = 1)", async () => {
        // this is the same as this.ancestors().graph()
        const expression = new AndRelated(new This(), /* depth = */ one);

        const graph = await getGraph();
        const value = await graph.read((tx) =>
            expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n }).then((v) =>
                v.makeConcrete()
            )
        );

        assertEquals(
            value,
            new PageValue(
                [
                    // The starting entry is always returned:
                    new AnnotatedValue(new EntryValue(ponderosaPine.id), { distance: new IntegerValue(0n) }),
                    // Ponderosa pine is related to the parent genus:
                    new AnnotatedValue(new EntryValue(defaultData.entries.genusPinus.id), {
                        distance: new IntegerValue(1n),
                    }),
                    // And there is an image related to ponderosa pine:
                    new AnnotatedValue(new EntryValue(defaultData.entries.imgPonderosaTrunk.id), {
                        distance: new IntegerValue(1n),
                    }),
                ],
                {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 3n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: ponderosaPine.id,
                },
            ),
        );
    });

    test("It can find all entries related to the ponderosa pine (depth = 2)", async () => {
        // this is the same as this.ancestors().graph()
        const expression = new AndRelated(new This(), /* depth = */ two);

        const graph = await getGraph();
        const value = await graph.read((tx) =>
            expression.getValue({ tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 15n }).then((v) =>
                v.makeConcrete()
            )
        );

        assertEquals(
            value,
            new PageValue(
                [
                    // The starting entry is always returned:
                    new AnnotatedValue(new EntryValue(ponderosaPine.id), { distance: new IntegerValue(0n) }),
                    // Ponderosa pine is related to the parent genus:
                    new AnnotatedValue(new EntryValue(defaultData.entries.genusPinus.id), {
                        distance: new IntegerValue(1n),
                    }),
                    // And there is an image related to ponderosa pine:
                    new AnnotatedValue(new EntryValue(defaultData.entries.imgPonderosaTrunk.id), {
                        distance: new IntegerValue(1n),
                    }),

                    // Via the parent genus, we have these entries:
                    new AnnotatedValue(new EntryValue(defaultData.entries.jackPine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.japaneseRedPine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.japaneseWhitePine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.jeffreyPine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.familyPinaceae.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.pinyonPine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.stonePine.id), {
                        distance: new IntegerValue(2n),
                    }),
                    new AnnotatedValue(new EntryValue(defaultData.entries.westernWhitePine.id), {
                        distance: new IntegerValue(2n),
                    }),
                ],
                {
                    pageSize: 15n,
                    startedAt: 0n,
                    totalCount: 11n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: ponderosaPine.id,
                },
            ),
        );
    });
});
