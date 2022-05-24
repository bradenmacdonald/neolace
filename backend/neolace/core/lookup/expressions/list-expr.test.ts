import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { IntegerValue, NullValue, PageValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";
import { List } from "./list-expr.ts";
import { Count } from "./functions/count.ts";

group("list-expr.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    const Int = (x: number) => new LiteralExpression(new IntegerValue(x));

    test(`An empty list`, async () => {
        const expression = new List([]);
        const value = PageValue.from([], 10n);

        assertEquals(await context.evaluateExprConcrete(expression), value);
        assertEquals(expression.toString(), "[]");
    });

    test(`It can hold two integers`, async () => {
        const expression = new List([Int(15), Int(-30)]);
        const value = PageValue.from([new IntegerValue(15), new IntegerValue(-30)], 10n);

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
