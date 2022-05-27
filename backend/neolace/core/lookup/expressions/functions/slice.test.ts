import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { ConcreteValue, IntegerValue, PageValue, StringValue } from "../../values.ts";

import { Slice } from "./slice.ts";
import { List } from "../list-expr.ts";
import { LiteralExpression } from "../literal-expr.ts";

group("slice.ts", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const int = (v: number) => new LiteralExpression(new IntegerValue(v));
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

    group("slice tests with list of ten string values", () => {
        const tenListValues = [
            new StringValue("A0"),
            new StringValue("B1"),
            new StringValue("C2"),
            new StringValue("D3"),
            new StringValue("E4"),
            new StringValue("F5"),
            new StringValue("G6"),
            new StringValue("H7"),
            new StringValue("I8"),
            new StringValue("J9"),
        ];
        // A list containing the above ten entries
        const tenList = new List(tenListValues.map((v) => new LiteralExpression(v)));

        const check = (value: ConcreteValue, expected: ConcreteValue[], { startedAt }: { startedAt: bigint }) => {
            assertEquals(
                value,
                new PageValue(
                    expected,
                    {
                        pageSize: BigInt(expected.length),
                        startedAt,
                        totalCount: 10n,
                        sourceExpression: tenList,
                        sourceExpressionEntryId: ponderosaPine.id,
                    },
                ),
            );
        };

        test("slice(list) without arguments returns the whole list", async () => {
            const expression = new Slice(tenList, {});
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues, { startedAt: 0n });
        });

        test("slice(list, start=5)", async () => {
            const expression = new Slice(tenList, { start: int(5) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(5), { startedAt: 5n });
        });

        test("slice(list, start=-3)", async () => {
            const expression = new Slice(tenList, { start: int(-3) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(7), { startedAt: 7n });
        });

        test("slice(list, start=-30)", async () => {
            const expression = new Slice(tenList, { start: int(-30) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues, { startedAt: 0n });
        });

        test("slice(list, start=5, size=2)", async () => {
            const expression = new Slice(tenList, { start: int(5), size: int(2) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(5, 7), { startedAt: 5n });
        });

        test("slice(list, start=5, end=8)", async () => {
            const expression = new Slice(tenList, { start: int(5), end: int(8) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(5, 8), { startedAt: 5n });
        });

        test("slice(list, start=5, end=8, size=2)", async () => {
            // size takes priority over end
            const expression = new Slice(tenList, { start: int(5), end: int(8), size: int(2) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(5, 7), { startedAt: 5n });
        });

        test("slice(list, end=500)", async () => {
            const expression = new Slice(tenList, { end: int(500) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues, { startedAt: 0n });
        });

        test("slice(list, start=3, end=-3)", async () => {
            const expression = new Slice(tenList, { start: int(3), end: int(-3) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(3, 7), { startedAt: 3n });
        });

        test("slice(list, end=-3, size=2)", async () => {
            const expression = new Slice(tenList, { end: int(-3), size: int(2) });
            const value = await context.evaluateExprConcrete(expression);
            check(value, tenListValues.slice(0, 2), { startedAt: 0n });
        });
    });
});