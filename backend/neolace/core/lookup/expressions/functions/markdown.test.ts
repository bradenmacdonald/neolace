/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { InlineMarkdownStringValue, NullValue, StringValue } from "../../values.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { Markdown } from "./markdown.ts";
import { LookupEvaluationError } from "../../errors.ts";

group("markdown.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    test(`It can be given a string argument, and returns an InlineMarkdownStringValue`, async () => {
        const stringValue = new StringValue("**markdown**");
        const expression = new Markdown(new LiteralExpression(stringValue));

        assertEquals(await context.evaluateExprConcrete(expression), new InlineMarkdownStringValue("**markdown**"));
        assertEquals(expression.toString(), `markdown("**markdown**")`);
    });

    test(`It gives an error with invalid input`, async () => {
        const nullValue = new NullValue();
        const expression = new Markdown(new LiteralExpression(nullValue));

        await assertRejects(
            () => context.evaluateExprConcrete(expression),
            LookupEvaluationError,
            `The expression "null" is not of the right type.`,
        );
    });
});
