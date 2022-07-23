import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { ConcreteValue, IntegerValue, NullValue, PageValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { List } from "./list-expr.ts";
import { Count } from "./functions/count.ts";
import { LookupExpression } from "./base.ts";

/** Helper method to quickly make a "Page" value from a fixed array of values */
function pageValueFrom<T extends ConcreteValue>(
    values: T[],
    minPageSize = 1n,
    sourceExpression: LookupExpression,
): PageValue<T> {
    const pageSize = values.length < minPageSize ? minPageSize : BigInt(values.length);
    return new PageValue(values, {
        startedAt: 0n,
        pageSize,
        totalCount: BigInt(values.length),
        sourceExpression,
        sourceExpressionEntryId: undefined,
    });
}

group("list-expr.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    const Int = (x: number) => new LiteralExpression(new IntegerValue(x));

    test(`An empty list`, async () => {
        const expression = new List([]);
        const value = pageValueFrom([], 10n, expression);

        assertEquals(await context.evaluateExprConcrete(expression), value);
        assertEquals(expression.toString(), "[]");
    });

    test(`It can hold two integers`, async () => {
        const expression = new List([Int(15), Int(-30)]);
        const value = pageValueFrom([new IntegerValue(15), new IntegerValue(-30)], 10n, expression);

        assertEquals(await context.evaluateExprConcrete(expression), value);
        assertEquals(expression.toString(), `[15, -30]`);
    });

    test(`It can be counted`, async () => {
        const expression = new Count(
            new List([Int(1), Int(2), new LiteralExpression(new NullValue())]),
        );
        const value = new IntegerValue(3);

        assertEquals(await context.evaluateExprConcrete(expression), value);
        assertEquals(expression.toString(), `[1, 2, null].count()`);
    });

    // TODO test that this can be evaluated to get the count() without evaluating lazy values that it holds
});
