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
        assertEquals(
            await context.evaluateExprConcrete(entries),
            await context.evaluateExprConcrete(new Filter(entries, {})),
        );
    });

    test(`x.filter() returns only entries of the right type`, async () => {
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

    test(`x.filter() returns only entries of the right type (multiple types)`, async () => {
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
});
