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

    test("Sorting booleans", async () => {
        await checkSort(
            `[false, true, false, true].sort()`,
            `[false, false, true, true]`,
        );
    });

    test("Sorting integers", async () => {
        await checkSort(
            `[18, -10, 5, 64, 0, -3, -18].sort()`,
            `[-18, -10, -3, 0, 5, 18, 64]`,
        );
        await checkSort(
            `[18, 5, 64, 0, -3, -10, -18].sort(reverse=true)`,
            `[64, 18, 5, 0, -3, -10, -18]`,
        );
    });

    test("Sorting integers with a slice", async () => {
        await checkSort(
            `[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort().slice(size=20)`,
            `[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29].slice(size=20)`,
        );
        await checkSort(
            `[20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort().slice(start=5, size=10)`,
            `[0, 0, 0, 0, 0, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24, 0, 0, 0, 0, 0].slice(start=5, size=10)`,
            // Note only the numbers in [5..15] are used in the comparison, so we set the rest to zero here.
        );
    });

    test("NULL values always sort last", async () => {
        await checkSort(
            `[18, -10, 5, null, null, null, 64, 0, -3, -18].sort()`,
            `[-18, -10, -3, 0, 5, 18, 64, null, null, null]`,
        );
        await checkSort(
            `[18, null, 5, 64, 0, -3, -10, null, -18].sort(reverse=true)`,
            `[64, 18, 5, 0, -3, -10, -18, null, null]`,
        );
    });

    test("Sorting large integers", async () => {
        await checkSort(
            `[
                1,
                9999999999999999999999999999999999,
                1234567890000000000000000000000200,
                1234567890000000000000000000000300,
                1234567890000000000000000000000303,
                1234567890000000000000000000000100,
                55555555555555555555555555555555,
                1000000000000000000000000000000000000000,
            ].sort()`,
            `[
                1,
                55555555555555555555555555555555,
                1234567890000000000000000000000100,
                1234567890000000000000000000000200,
                1234567890000000000000000000000300,
                1234567890000000000000000000000303,
                9999999999999999999999999999999999,
                1000000000000000000000000000000000000000,
            ]`,
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

    test("Unitless Quantities and Integers mixed and matched will sort as you would expect", async () => {
        await checkSort(
            `[
                2.5,
                1.0,
                -17.3,
                2,
                10,
                -25,
            ].sort()`,
            `[
                -25,
                -17.3,
                1.0,
                2,
                2.5,
                10,
            ]`,
        );
    });

    test("Quantities sort as you would expect", async () => {
        await checkSort(
            `[
                1 [in],
                1 [cm],
                0.1 [cm],
                2 [cm],
            ].sort()`,
            `[
                0.1 [cm],
                1 [cm],
                2 [cm],
                1 [in],
            ]`,
        );
        await checkSort(
            `[
                1 [in],
                1 [cm],
                0.1 [cm],
                2 [cm],
            ].sort(reverse=true)`,
            `[
                1 [in],
                2 [cm],
                1 [cm],
                0.1 [cm],
            ]`,
        );
    });
});
