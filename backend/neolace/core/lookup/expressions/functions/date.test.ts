/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { DatePartialValue, DateValue, StringValue } from "../../values.ts";
import { DateExpression } from "./date.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("date.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    async function checkInvalidStr(dateStr: string, errorStr?: string) {
        const expr = new DateExpression(new LiteralExpression(new StringValue(dateStr)));
        await assertRejects(
            () => context.evaluateExpr(expr),
            LookupEvaluationError,
            errorStr ?? "Date values should be in the format YYYY-MM-DD (or YYYY, YYYY-MM, MM-DD, or MM).",
        );
    }

    test(`toString()`, async () => {
        const expr = new DateExpression(new LiteralExpression(new StringValue("2020-01-10")));
        assertEquals(expr.toString(), 'date("2020-01-10")');
    });

    test(`It can parse dates`, async () => {
        async function checkString(dateStr: string, expected?: string) {
            const expr = new DateExpression(new LiteralExpression(new StringValue(dateStr)));
            const value = await context.evaluateExpr(expr);
            assertInstanceOf(value, DateValue);
            assertEquals(value.asIsoString(), expected ?? dateStr);
        }

        // Check some "typical" dates:
        await checkString("2020-01-10");
        await checkString("2020-03-31");
        await checkString("2020-04-01");
        await checkString("20200110", "2020-01-10");
        // Check future dates:
        await checkString("2036-02-29");
        await checkString("2072-02-29");
        // Check past dates:
        await checkString("1969-07-20");
        await checkString("1867-07-01");
    });

    test(`It rejects invalid dates`, async () => {
        // These are all invalid dates:
        await checkInvalidStr("foobar");
        await checkInvalidStr("NNNN-NN-NN");
        await checkInvalidStr("");
        await checkInvalidStr("123");
        await checkInvalidStr("1234-56-78", "1234-56-78 is not a valid date.");
        await checkInvalidStr("2020-02-45", "2020-02-45 is not a valid date.");
        await checkInvalidStr("2070-02-29", "Invalid date."); // Not a leap year
    });

    async function checkPartialString(
        dateStr: string,
        expected: { year?: number; month?: number; day?: number },
        expectedIsoStr?: string,
    ) {
        const expr = new DateExpression(new LiteralExpression(new StringValue(dateStr)));
        const value = await context.evaluateExpr(expr);
        assertInstanceOf(value, DatePartialValue);
        assertEquals(value, new DatePartialValue(expected));
        assertEquals(value.asIsoString(), expectedIsoStr ?? dateStr);
    }

    test(`It can parse partial dates - YYYY format`, async () => {
        await checkPartialString("2020", { year: 2020 });
        await checkPartialString("1865", { year: 1865 });
        await checkPartialString("3000", { year: 3000 });
        // Invalid:
        await checkInvalidStr("1000", `Invalid year "1000"; needs to be between 1583 and 9999 CE.`);
    });

    test(`It can parse partial dates - YYYY-MM format`, async () => {
        await checkPartialString("2020-01", { year: 2020, month: 1 });
        await checkPartialString("1999-05", { year: 1999, month: 5 });
        await checkPartialString("3000-12", { year: 3000, month: 12 });
    });

    test(`It can parse partial dates with only a month - MM or --MM format`, async () => {
        await checkPartialString("01", { month: 1 }, "--01"); // This "MM" format is our preferred format.
        await checkPartialString("05", { month: 5 }, "--05");
        await checkPartialString("12", { month: 12 }, "--12");
        await checkPartialString("--01", { month: 1 }); // This format was previously defined by an ISO8601 standard
        await checkPartialString("--05", { month: 5 });
        await checkPartialString("--12", { month: 12 });
        // Invalid:
        await checkInvalidStr("00", `Invalid month "0"; needs to be between 1 and 12.`);
        await checkInvalidStr("99", `Invalid month "99"; needs to be between 1 and 12.`);
        await checkInvalidStr("MM");
        await checkInvalidStr("NN");
    });

    test(`It can parse partial dates with a month and a day (MM-DD or --MM-DD)`, async () => {
        await checkPartialString("01-01", { month: 1, day: 1 }, "--01-01");
        await checkPartialString("05-31", { month: 5, day: 31 }, "--05-31");
        await checkPartialString("12-25", { month: 12, day: 25 }, "--12-25");
        await checkPartialString("02-29", { month: 2, day: 29 }, "--02-29"); // Feb 29 is valid
        await checkPartialString("--01-01", { month: 1, day: 1 });
        await checkPartialString("--05-31", { month: 5, day: 31 });
        await checkPartialString("--12-25", { month: 12, day: 25 });
        await checkPartialString("--02-29", { month: 2, day: 29 }); // Feb 29 is valid
        // Invalid:
        await checkInvalidStr("31-12", `Invalid month "31"; needs to be between 1 and 12.`);
        await checkInvalidStr("--31-12", `Invalid month "31"; needs to be between 1 and 12.`);
        await checkInvalidStr("00-12", `Invalid month "0"; needs to be between 1 and 12.`);
        await checkInvalidStr("--00-12", `Invalid month "0"; needs to be between 1 and 12.`);
        await checkInvalidStr("06-00", `Invalid day "0"; needs to be between 1 and 30.`);
        await checkInvalidStr("06-31", `Invalid day "31"; needs to be between 1 and 30.`);
        await checkInvalidStr("07-32", `Invalid day "32"; needs to be between 1 and 31.`);
        await checkInvalidStr("02-30", `Invalid day "30"; needs to be between 1 and 29.`);
    });
});
