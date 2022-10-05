import { assertEquals, assertInstanceOf, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { List, LiteralExpression, Sort } from "../expressions.ts";
import { IntegerValue, PageValue, QuantityValue } from "../values.ts";

group("QuantityValue.ts", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, entryId: undefined });
    const QV = (magnitude: number, units?: string) => new QuantityValue(magnitude, units);
    const LiteralQV = (magnitude: number, units?: string) => new LiteralExpression(QV(magnitude, units));
    const Int = (value: number) => new IntegerValue(value);
    const LiteralInt = (value: number) => new LiteralExpression(Int(value));

    test("Unitless Quantities and Integers mixed and matched will sort as you would expect", async () => {
        // Convert the list to a LazyIterableValue
        const basicList = new List([
            LiteralQV(2.5),
            LiteralQV(1.0),
            LiteralQV(-17.3),
            LiteralInt(2),
            LiteralInt(10),
            LiteralInt(-25),
        ]);
        const sorted = await context.evaluateExprConcrete(new Sort(basicList, {}));

        assertInstanceOf(sorted, PageValue);
        assertEquals(sorted.values, [
            Int(-25),
            QV(-17.3),
            QV(1.0),
            Int(2),
            QV(2.5),
            Int(10),
        ]);
    });

    test("Quantities sort as you would expect", async () => {
        // Convert the list to a LazyIterableValue
        const basicList = new List([
            LiteralQV(1, "in"),
            LiteralQV(1, "cm"),
            LiteralQV(0.1, "cm"),
            LiteralQV(2, "cm"),
        ]);
        const sorted = await context.evaluateExprConcrete(new Sort(basicList, {}));

        assertInstanceOf(sorted, PageValue);
        assertEquals(sorted.values, [
            QV(0.1, "cm"),
            QV(1, "cm"),
            QV(2, "cm"),
            QV(1, "in"),
        ]);
    });
});
