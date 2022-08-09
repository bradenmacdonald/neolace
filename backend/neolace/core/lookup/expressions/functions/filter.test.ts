import { assertEquals, assertInstanceOf, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import * as V from "../../values.ts";
import { AndAncestors, Filter, List, LiteralExpression, This } from "../../expressions.ts";

group("filter.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, entryId: defaultData.entries.ponderosaPine.id });

    const genusType = new LiteralExpression(new V.EntryTypeValue(defaultData.schema.entryTypes._ETGENUS.id));
    const orderType = new LiteralExpression(new V.EntryTypeValue(defaultData.schema.entryTypes._ETORDER.id));

    test(`x.filter() returns x if x is a LazyEntrySet`, async () => {
        const entries = new AndAncestors(new This());
        const orig = await context.evaluateExprConcrete(entries);
        const filtered = await context.evaluateExprConcrete(new Filter(entries, {}));
        assertInstanceOf(orig, V.PageValue);
        assertInstanceOf(filtered, V.PageValue);
        assertEquals(orig.values, filtered.values);
        assertEquals(orig.sourceExpression, entries);
        assertEquals(filtered.sourceExpression, new Filter(entries, {}));
    });

    test(`x.filter(entryType=[entry type]) returns only entries of the right type`, async () => {
        const entries = new AndAncestors(new This());
        // Filter "ponderosa pine and its ancestors" to only entries of type "Genus":
        const value = await context.evaluateExprConcrete(new Filter(entries, { entryType: genusType }));
        assertInstanceOf(value, V.PageValue);
        assertEquals(value.values, [
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.genusPinus.id), {
                // The annotation is preserved - genus is a distance of 1 from the original species entry:
                distance: new V.IntegerValue(1),
            }),
        ]);
    });

    test(`x.filter(entryType=[multiple types]) returns only entries of the right type`, async () => {
        const entries = new AndAncestors(new This());
        // Filter "ponderosa pine and its ancestors" to only entries of type "Genus" or "Order":
        const value = await context.evaluateExprConcrete(
            new Filter(entries, {
                entryType: new List([
                    genusType,
                    orderType,
                ]),
            }),
        );
        assertInstanceOf(value, V.PageValue);
        assertEquals(value.values, [
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.genusPinus.id), {
                // The annotation is preserved - genus is a distance of 1 from the original species entry:
                distance: new V.IntegerValue(1),
            }),
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.orderPinales.id), {
                // The annotation is preserved - order is a distance of 3 from the original species entry:
                distance: new V.IntegerValue(3),
            }),
        ]);
    });

    test(`x.filter(excludeEntryType=[multiple types]) returns only entries of the right type`, async () => {
        const entries = new AndAncestors(new This());
        // Filter "ponderosa pine and its ancestors" to only entries of type "Genus" or "Order":
        const value = await context.evaluateExprConcrete(
            new Filter(entries, {
                excludeEntryType: new List([
                    genusType,
                    orderType,
                ]),
            }),
        );
        assertInstanceOf(value, V.PageValue);
        assertEquals(value.values, [
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.ponderosaPine.id), {
                // The annotation is preserved - this is the original "this" entry so has distance 0:
                distance: new V.IntegerValue(0),
            }),
            // Genus (distance 1) is excluded
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.familyPinaceae.id), {
                // The annotation is preserved - family is a distance of 2 from the original species entry:
                distance: new V.IntegerValue(2),
            }),
            // Order (distance 3) is excluded
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.classPinopsida.id), {
                distance: new V.IntegerValue(4),
            }),
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.divisionTracheophyta.id), {
                distance: new V.IntegerValue(5),
            }),
        ]);
    });

    test(`x.filter(exclude=[multiple entries]) excludes specific entries`, async () => {
        const entries = new AndAncestors(new This());
        // Filter "ponderosa pine and its ancestors" to only entries of type "Genus" or "Order":
        const value = await context.evaluateExprConcrete(
            new Filter(entries, {
                exclude: new List([
                    new This(),
                    new LiteralExpression(new V.EntryValue(defaultData.entries.genusPinus.id)),
                ]),
            }),
        );
        assertInstanceOf(value, V.PageValue);
        assertEquals(value.values, [
            // "This" (ponderosa pine) is excluded
            // Genus (distance 1) is excluded
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.familyPinaceae.id), {
                distance: new V.IntegerValue(2),
            }),
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.orderPinales.id), {
                distance: new V.IntegerValue(3),
            }),
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.classPinopsida.id), {
                distance: new V.IntegerValue(4),
            }),
            new V.AnnotatedValue(new V.EntryValue(defaultData.entries.divisionTracheophyta.id), {
                distance: new V.IntegerValue(5),
            }),
        ]);
    });
});
