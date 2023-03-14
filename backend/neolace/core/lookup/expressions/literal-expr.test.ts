/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { IntegerValue, NullValue, StringValue } from "../values.ts";
import { LiteralExpression } from "./literal-expr.ts";

group("literal-expr.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It can hold an integer value and express it as a literal`, async () => {
        const value = new IntegerValue(-30);
        const expression = new LiteralExpression(value);

        assertEquals(await context.evaluateExpr(expression), value);
        assertEquals(expression.toString(), "-30");
    });

    test(`It can hold a string value and express it as a literal`, async () => {
        const value = new StringValue("hello world");
        const expression = new LiteralExpression(value);

        assertEquals(await context.evaluateExpr(expression), value);
        assertEquals(expression.toString(), `"hello world"`);
    });

    test(`It can hold a null value and express it as a literal`, async () => {
        const value = new NullValue();
        const expression = new LiteralExpression(value);

        assertEquals(await context.evaluateExpr(expression), value);
        assertEquals(expression.toString(), `null`);
    });

    // test(`It gives an error with non-literal values`, async () => {
    //     const value = TODO
    //     const expression = new EntryValue(value);

    //     TODO
    // });
});
