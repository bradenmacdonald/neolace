import { assertEquals, assertInstanceOf, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { List, LiteralExpression } from "../expressions.ts";
import { IntegerValue, LazyIterableValue, LookupValue } from "../values.ts";
import { iterateOver } from "./base.ts";

group("LazyIterableValue.ts", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, entryId: undefined });
    const Int = (value: number) => new IntegerValue(value);

    test("It can be iterated over", async () => {
        const numbers = [
            Int(1),
            Int(2),
            Int(3),
        ];
        // Convert the list to a LazyIterableValue
        const lazyIterable = await context.evaluateExpr(new List(numbers.map((n) => new LiteralExpression(n))));
        assertInstanceOf(lazyIterable, LazyIterableValue);

        // Now check that we can iterate over it using an async iterator:
        const values: LookupValue[] = [];
        for await (const v of iterateOver(lazyIterable)) {
            values.push(v);
        }
        assertEquals(values, numbers);
    });

    test("It can be iterated over even at page boundaries", async () => {
        // The internal page size for async iteration is 50, so we check for bugs around that size.
        for (const arrayLength of [48, 49, 50, 51, 99, 100, 101]) {
            const numbers: IntegerValue[] = [];
            for (let i = 0; i < arrayLength; i++) {
                numbers.push(Int(i));
            }
            assertEquals(numbers.length, arrayLength);
            // Convert the list to a LazyIterableValue
            const lazyIterable = await context.evaluateExpr(new List(numbers.map((n) => new LiteralExpression(n))));
            assertInstanceOf(lazyIterable, LazyIterableValue);

            // Now check that we can iterate over it using an async iterator and we get the right values:
            const values: LookupValue[] = [];
            for await (const v of iterateOver(lazyIterable)) {
                values.push(v);
            }
            assertEquals(values, numbers);
        }
    });
});
