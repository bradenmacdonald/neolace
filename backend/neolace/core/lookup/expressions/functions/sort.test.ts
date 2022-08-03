import { assertEquals, assertInstanceOf, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { PageValue } from "../../values.ts";

group("sort.ts", () => {
    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    const checkSort = async (expression1: string, expression2: string) => {
        const value1 = await context.evaluateExprConcrete(expression1);
        const value2 = await context.evaluateExprConcrete(expression2);
        assertInstanceOf(value1, PageValue);
        assertInstanceOf(value2, PageValue);
        assertEquals(value1.values, value2.values);
        assertEquals(value1.totalCount, value2.totalCount);
    };

    test("Sorting an empty list has no effect", async () => {
        await checkSort(
            `[].sort()`,
            `[]`,
        );
    });

    test("Sorting strings", async () => {
        await checkSort(
            `["b", "a", "c"].sort()`,
            `["a", "b", "c"]`,
        );
        await checkSort(
            `["hello B", "hello C", "hello A"].sort()`,
            `["hello A", "hello B", "hello C"]`,
        );
    });

    test("Sorting integers", async () => {
        await checkSort(
            `[18, 5, 64, 0, -3, -18].sort()`,
            `[-18, -3, 0, 5, 18, 64]`,
        );
        await checkSort(
            `[18, 5, 64, 0, -3, -18].sort(reverse=true)`,
            `[64, 18, 5, 0, -3, -18]`,
        );
    });

    test("Sorting dates", async () => {
        await checkSort(
            `[date("1998-01-02"), date("2022-05-06"), date("2022-05-05")].sort()`,
            `[date("1998-01-02"), date("2022-05-05"), date("2022-05-06")]`,
        );
        await checkSort(
            `[date("1998-01-02"), date("2022-05-06"), date("2022-05-05")].sort(reverse=true)`,
            `[date("2022-05-06"), date("2022-05-05"), date("1998-01-02")]`,
        );
    });

    test("Sorting entries by name", async () => {
        await checkSort(
            `entry("s-pinus-ponderosa").andAncestors().sort(by=(e -> e.name)).map(apply=(e -> e.name))`,
            `["Pinaceae", "Pinales", "Pinopsida", "Pinus", "Ponderosa Pine", "Tracheophyta"]`,
        );
    });
});