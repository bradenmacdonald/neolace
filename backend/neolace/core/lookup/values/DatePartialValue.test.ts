/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { DatePartialValue, DateValue, LookupValue } from "../values.ts";

group("DatePartialValue.ts", () => {
    // These tests don't need any example data.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);
    // Doesn't matter what site ID we use here, since we're not accessing any site data.
    // const context = new TestLookupContext({ siteId: VNID("_0"), entryId: undefined });
    const DPV = (args: { year?: number; month?: number; day?: number }) => new DatePartialValue(args);

    test("year only", async () => {
        const a = DPV({ year: 2010 });
        assertEquals(a.year, 2010);
        assertEquals(a.month, undefined);
        assertEquals(a.day, undefined);
        assertEquals(a.asIsoString(), "2010");
        assertEquals(a.toJSON(), { type: "DatePartial", value: "2010", year: 2010 });
    });

    test("month and day", async () => {
        const a = DPV({ month: 5, day: 15 });
        assertEquals(a.year, undefined);
        assertEquals(a.month, 5);
        assertEquals(a.day, 15);
        assertEquals(a.asIsoString(), "--05-15");
        assertEquals(a.toJSON(), { type: "DatePartial", value: "--05-15", month: 5, day: 15 });
    });

    test("year and month", async () => {
        const a = DPV({ month: 10, year: 2029 });
        assertEquals(a.year, 2029);
        assertEquals(a.month, 10);
        assertEquals(a.day, undefined);
        assertEquals(a.asIsoString(), "2029-10");
        assertEquals(a.toJSON(), { type: "DatePartial", value: "2029-10", month: 10, year: 2029 });
    });

    test("month only", async () => {
        const a = DPV({ month: 1 });
        assertEquals(a.year, undefined);
        assertEquals(a.month, 1);
        assertEquals(a.day, undefined);
        assertEquals(a.asIsoString(), "--01");
        assertEquals(a.toJSON(), { type: "DatePartial", value: "--01", month: 1 });
    });

    group("comparisons", () => {
        test("Simple comparison of years", async () => {
            assertEquals(DPV({ year: 2020 }).compareTo(DPV({ year: 2020 })), 0);
            assertEquals(DPV({ year: 2024 }).compareTo(DPV({ year: 2020 })), 1);
            assertEquals(DPV({ year: 1995 }).compareTo(DPV({ year: 2020 })), -1);
        });

        test("Simple comparison of months", async () => {
            assertEquals(DPV({ month: 6 }).compareTo(DPV({ month: 6 })), 0);
            assertEquals(DPV({ month: 12 }).compareTo(DPV({ month: 8 })), 1);
            assertEquals(DPV({ month: 1 }).compareTo(DPV({ month: 2 })), -1);
        });

        test("Simple comparison of month + days", async () => {
            assertEquals(DPV({ month: 6, day: 15 }).compareTo(DPV({ month: 6, day: 15 })), 0);
            assertEquals(DPV({ month: 6, day: 15 }).compareTo(DPV({ month: 6, day: 14 })), 1);
            assertEquals(DPV({ month: 6, day: 15 }).compareTo(DPV({ month: 6, day: 16 })), -1);
            assertEquals(DPV({ month: 6, day: 15 }).compareTo(DPV({ month: 5, day: 16 })), 1);
        });

        test("comparing dates and date partial values", async () => {
            const expectCompare = <A extends LookupValue, B extends LookupValue>(a: A, b: B, result: number) => {
                assertEquals(a.compareTo(b), result);
                assertEquals(b.compareTo(a), result * -1);
            };
            // "Jan 1, 2021" comes before "June 2021"
            expectCompare(new DateValue(2021, 1, 1), DPV({ year: 2021, month: 6 }), -1);
            // "May 31, 2021" comes before "June 2021"
            expectCompare(new DateValue(2021, 5, 31), DPV({ year: 2021, month: 6 }), -1);
            // "June 15, 2021" comes after "June 2021"
            expectCompare(new DateValue(2021, 6, 15), DPV({ year: 2021, month: 6 }), 1);
            // "June 1, 2021" equals "June 2021" for comparison purposes.
            expectCompare(new DateValue(2021, 6, 1), DPV({ year: 2021, month: 6 }), 0);

            // "2022" comes before "Jan 1, 2023"
            expectCompare(DPV({ year: 2022 }), new DateValue(2023, 1, 1), -1);
            // "2022" equals "Jan 1, 2022" for comparison purposes
            expectCompare(DPV({ year: 2022 }), new DateValue(2022, 1, 1), 0);
            // "2022" comes before "August 5, 2022"
            expectCompare(DPV({ year: 2022 }), new DateValue(2022, 8, 5), -1);
            // "2022" comes after "Dec 31, 2021"
            expectCompare(DPV({ year: 2022 }), new DateValue(2021, 12, 31), 1);
        });
    });
});
