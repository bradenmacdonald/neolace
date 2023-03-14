/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
