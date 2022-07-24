import { assertEquals, assertInstanceOf, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { LambdaValue } from "../values.ts";
import { Lambda } from "./lambda.ts";
import { Ancestors, Variable } from "../expressions.ts";

group("lambda.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`A lambda expression evaluates to a lambda value`, async () => {
        // (e -> e.ancestors())
        const innerExpression = new Ancestors(new Variable("e"));
        const expression = new Lambda("e", innerExpression);
        const value = await context.evaluateExpr(expression);

        assertInstanceOf(value, LambdaValue);
        assertEquals(value.innerExpression, innerExpression);
        assertEquals(value.variableName, "e");
    });

    test(`toString()`, async () => {
        // (e -> e.ancestors())
        const innerExpression = new Ancestors(new Variable("e"));
        const expression = new Lambda("e", innerExpression);
        assertEquals(expression.toString(), `(e -> e.ancestors())`);
    });
});
