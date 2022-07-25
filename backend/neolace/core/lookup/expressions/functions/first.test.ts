import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { AnnotatedValue, EntryValue, IntegerValue, NullValue, StringValue } from "../../values.ts";
import { First } from "./first.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { List } from "../list-expr.ts";
import { Ancestors } from "./ancestors.ts";

group("first.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });
    const literal = (v: bigint | string | null) =>
        new LiteralExpression(
            typeof v === "bigint" ? new IntegerValue(v) : typeof v === "string" ? new StringValue(v) : new NullValue(),
        );

    test(`It gives a null values with an empty list`, async () => {
        const expression = new First(new List([]));

        assertEquals(await context.evaluateExpr(expression), new NullValue());
    });

    test(`It does not give the first letter from a string`, async () => {
        // In the future we want to allow .get().first() to give the first value regardless of whether .get() returns
        // a single value or a list, so for now it's important to not treat strings as iterables.
        await assertRejects(
            () => context.evaluateExpr(new First(literal("Athens"))),
            LookupEvaluationError,
            `The expression ""Athens"" cannot be used with first().`,
        );
    });

    test(`It gives the first value from a list`, async () => {
        assertEquals(await context.evaluateExpr(new First(new List([literal(123n)]))), new IntegerValue(123n));
        assertEquals(
            await context.evaluateExpr(new First(new List([literal("hello"), literal("world")]))),
            new StringValue("hello"),
        );
    });

    test(`It gives the first value from a lazy entry set`, async () => {
        assertEquals(
            await context.evaluateExprConcrete(
                new First(
                    // Get the first ancestor of the ponderosa pine, which is "genus pinus":
                    new Ancestors(new LiteralExpression(new EntryValue(defaultData.entries.ponderosaPine.id))),
                ),
            ),
            new AnnotatedValue(
                new EntryValue(defaultData.entries.genusPinus.id),
                // Since we used ancestors(), the results are annotated with the distance from the entry:
                { distance: new IntegerValue(1n) },
            ),
        );
    });

    test(`It gives an error message when used with non-iterables`, async () => {
        const expression = new First(literal(111111111122222222223333333333444444444455555555556666666666n));

        await assertRejects(
            () => context.evaluateExpr(expression),
            LookupEvaluationError,
            // Note that the expression is shortened to 50 characters long
            `The expression "111111111122222222223333333333444444444455555…6666" cannot be used with first().`,
        );
    });

    test(`toString()`, async () => {
        assertEquals((new First(new List([literal(123n)]))).toString(), `[123].first()`);
    });
});
