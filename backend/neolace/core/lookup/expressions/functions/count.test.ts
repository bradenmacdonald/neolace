import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { IntegerValue } from "../../values.ts";
import { Count } from "./count.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { This } from "../this.ts";

group("count.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It gives an error with non-countable values`, async () => {
        const expression = new Count(new LiteralExpression(new IntegerValue(-30)));

        await assertRejects(
            () => context.evaluateExprConcrete(expression),
            LookupEvaluationError,
            `The expression "-30" cannot be counted with count().`,
        );
    });

    test(`toString()`, async () => {
        assertEquals((new Count(new LiteralExpression(new IntegerValue(-30)))).toString(), "count(-30)");
        assertEquals((new Count(new This())).toString(), "this.count()");
    });
});
