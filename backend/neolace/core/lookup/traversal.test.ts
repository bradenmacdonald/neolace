import { assertEquals, group, test } from "neolace/lib/tests.ts";
import { This } from "./expressions/this.ts";
import { LookupExpression } from "./expressions/base.ts";
import { LiteralExpression } from "./expressions/literal-expr.ts";
import { parseLookupString } from "./parser/parser.ts";
import { StringValue } from "./values/StringValue.ts";

/**
 * Test that we can traverse over trees of Lookup Expressions and optionally modify them.
 */
group("traversal.test.ts", () => {
    // We don't use the graph at all for these tests.
    // setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Tests that just traverse the expression tree, not modify:

    const testCases: { expr: string; result: string[] }[] = [
        {
            // Recursively traversing the following expression:
            expr: `this`,
            // Should give this result (in order):
            result: [`this`],
        },

        {
            // Recursively traversing the following expression:
            expr: `this.get(prop=prop("foo"))`,
            // Should give this result (in order):
            result: [
                `"foo"`,
                `prop("foo")`,
                `this`,
                `this.get(prop=prop("foo"))`,
            ],
        },

        {
            // Recursively traversing the following expression:
            expr: `[1, 2, (e -> e.andRelated(depth=3)), this.key, markdown("foo")]`,
            // Should give this result (in order):
            result: [
                `1`,
                `2`,
                `3`,
                `e`,
                `e.andRelated(depth=3)`,
                `(e -> e.andRelated(depth=3))`,
                `this`,
                `this.key`,
                `"foo"`,
                `markdown("foo")`,
                `[1, 2, (e -> e.andRelated(depth=3)), this.key, markdown("foo")]`,
            ],
        },
    ];

    for (const testCase of testCases) {
        test(`Recursively traverse over the expression ${testCase.expr}`, () => {
            const expr = parseLookupString(testCase.expr);
            const result: string[] = [];
            expr.traverseTree((e) => result.push(e.toString()));
            assertEquals(result, testCase.result);
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Tests that modify

    const modifyTests: { expr: string; replacer: (expr: LookupExpression) => LookupExpression; expected: string }[] = [
        {
            expr: `["list", "of", "strings", "foobar", "zap"]`,
            replacer: (e) =>
                e instanceof LiteralExpression && e.value instanceof StringValue && e.value.value === "foobar"
                    ? parseLookupString(`"RABOOF"`)
                    : e,
            expected: `["list", "of", "strings", "RABOOF", "zap"]`,
            //                                    ^^^^^^ just this string should be modified.
        },
        {
            // Test replacing instances of 'this' in the expression with something else:
            expr: `(e -> e.get(prop=prop(this.key)))`,
            replacer: (e) => e instanceof This ? parseLookupString(`entry("entry15")`) : e,
            expected: `(e -> e.get(prop=prop(entry("entry15").key)))`,
        },
    ];

    for (const testCase of modifyTests) {
        test(`Recurse over and replace parts of the expression ${testCase.expr}`, () => {
            const expr = parseLookupString(testCase.expr);
            const result = expr.traverseTreeAndReplace(testCase.replacer);
            assertEquals(result.toString(), testCase.expected);
        });
    }
});
