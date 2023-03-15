/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, assertThrows, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import {
    AllEntries,
    Ancestors,
    AndAncestors,
    AndRelated,
    Annotate,
    Count,
    DateExpression,
    EntryFunction,
    First,
    GetAttribute,
    Graph,
    Image,
    Lambda,
    List,
    LiteralExpression,
    Map,
    Slice,
    This,
    Variable,
} from "../expressions.ts";
import { LookupExpression } from "../expressions/base.ts";
import { parseLookupString } from "./parser.ts";
import * as V from "../values.ts";
import { LookupParseError } from "../errors.ts";

const True = new LiteralExpression(new V.BooleanValue(true));
const False = new LiteralExpression(new V.BooleanValue(false));
const Int = (i: number | bigint) => new LiteralExpression(new V.IntegerValue(i));
const Quantity = (m: number, units?: string) => new LiteralExpression(new V.QuantityValue(m, units));
const Str = (x: string) => new LiteralExpression(new V.StringValue(x));

group("parser.ts", () => {
    // These tests don't use the database at all.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    const checks: {
        /** The lookup expression we're going to parse (as a string) */
        in: string;
        /** The lookup expression we expect to get after parsing (as an instance of a LookupExpression subclass) */
        out: LookupExpression | (typeof LookupParseError);
        errMessage?: string;
        /** If roundTrip is true, we expect the result.toString() to strictly match the input. */
        roundTripExact?: boolean;
    }[] = [
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Simple keywords:
        { in: `true`, out: True },
        { in: `  true `, out: True, roundTripExact: false },
        { in: `false`, out: False },
        { in: `  false `, out: False, roundTripExact: false },
        { in: `this`, out: new This() },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Variable names:
        { in: `e`, out: new Variable("e") },
        { in: `x`, out: new Variable("x") },
        { in: `entry`, out: new Variable("entry") },
        { in: `underscores_and_numbers_123`, out: new Variable("underscores_and_numbers_123") },
        // Test variable names that start with a keyword:
        { in: `thisEntry`, out: new Variable("thisEntry") },
        // Test invalid variable names:
        {
            in: `1number_at_start`,
            out: LookupParseError,
            errMessage: `Redundant input, expecting EOF but found: number_at_start`,
        },
        { in: `emoji🫠`, out: LookupParseError, errMessage: `unexpected character` },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Integers:
        { in: `0`, out: Int(0) },
        { in: `00`, out: LookupParseError, errMessage: `Redundant input, expecting EOF but found: 0` },
        { in: `-123`, out: Int(-123) },
        { in: `456`, out: Int(456) },
        { in: `1234567890123456789012345678901234567890`, out: Int(1234567890123456789012345678901234567890n) },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Strings:
        { in: `"hello"`, out: Str("hello") },
        { in: `  " whoa " `, out: Str(" whoa "), roundTripExact: false },
        { in: `"double \\"quotes\\" can be escaped."`, out: Str(`double "quotes" can be escaped.`) },
        {
            in: `"newline \\n tab \\t and unicode \\uD83D\\uDE4C"`,
            out: Str(`newline \n tab \t and unicode 🙌`),
            roundTripExact: false,
        },
        { in: `"emoji 🥰"`, out: Str("emoji 🥰") },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Lists:
        {
            in: `[]`,
            out: new List([]),
        },
        {
            in: `[1, 2, 3]`,
            out: new List([Int(1), Int(2), Int(3)]),
        },
        {
            in: `[1,2,3]`,
            out: new List([Int(1), Int(2), Int(3)]),
            roundTripExact: false,
        },
        {
            // Trailing comma:
            in: `[1, 2, 3, ]`,
            out: new List([Int(1), Int(2), Int(3)]),
            roundTripExact: false,
        },
        {
            // List inside a list, with commas inside the strings and a trailing comma:
            in: `["a", ["b,1", "b,2"], "c",]`,
            out: new List([Str("a"), new List([Str("b,1"), Str("b,2")]), Str("c")]),
            roundTripExact: false,
        },
        {
            in: `[null, 1, "hello, you", 123.annotate(a=1, b=2)]`,
            out: new List([
                new LiteralExpression(new V.NullValue()),
                Int(1),
                Str("hello, you"),
                new Annotate(Int(123n), { a: Int(1), b: Int(2) }),
            ]),
            roundTripExact: false,
        },
        {
            // List with 'deep' values that can break the default lookahead limit:
            in: `[entry("tc-ec-cell-li"), entry("tc-ec-cell")]`,
            out: new List([new EntryFunction(Str("tc-ec-cell-li")), new EntryFunction(Str("tc-ec-cell"))]),
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Quantity values:
        {
            in: `1.23`,
            out: Quantity(1.23),
        },
        {
            in: `0.003 [ng]`,
            out: Quantity(0.003, "ng"),
        },
        {
            in: `50 [%]`,
            out: Quantity(50, "%"),
        },
        {
            in: `15 [m]`,
            out: Quantity(15, "m"),
        },
        {
            in: `1500.2 [K kg⋅m/s^2]`,
            out: Quantity(1500.2, "K kg⋅m/s^2"),
        },
        // In a list:

        {
            in: `[30 [mg], 50 [mg]]`,
            out: new List([Quantity(30, "mg"), Quantity(50, "mg")]),
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Functions
        { in: `allEntries()`, out: new AllEntries() },
        { in: `foobar()`, out: LookupParseError, errMessage: "Unknown function: foobar()" },
        { in: `this.ancestors()`, out: new Ancestors(new This()) },
        { in: `this.ancestors().count()`, out: new Count(new Ancestors(new This())) },
        { in: `count(this.ancestors())`, out: new Count(new Ancestors(new This())), roundTripExact: false },
        { in: `ancestors(this)`, out: new Ancestors(new This()), roundTripExact: false },
        { in: `date("2017-06-01")`, out: new DateExpression(Str("2017-06-01")) },
        {
            in: `this.andAncestors().andRelated(depth=3).graph()`,
            out: new Graph(
                new AndRelated(new AndAncestors(new This()), { depth: new LiteralExpression(new V.IntegerValue(3)) }),
            ),
        },
        {
            in: `slice("abcdefghijk", start=3, size=4)`,
            out: new Slice(Str("abcdefghijk"), {
                start: Int(3),
                size: Int(4),
            }),
        },
        // Three arguments:
        {
            in: `this.image(format="thumb", link=this)`,
            out: new Image(new This(), {
                format: Str("thumb"),
                link: new This(),
            }),
        },
        {
            in: `image(this, format="thumb", link=this)`,
            out: new Image(new This(), {
                format: Str("thumb"),
                link: new This(),
            }),
            roundTripExact: false,
        },
        // Four arguments:
        {
            in: `entry("_4kfv0p8IFnzOOOdjmJRw4E").image(format="logo", link="https://www.technotes.org/", maxWidth=60)`,
            out: new Image(new EntryFunction(Str("_4kfv0p8IFnzOOOdjmJRw4E")), {
                format: Str("logo"),
                link: Str("https://www.technotes.org/"),
                maxWidth: new LiteralExpression(new V.IntegerValue(60)),
            }),
        },
        // Invalid arguments:
        {
            in: `x.allEntries()`,
            out: LookupParseError,
            errMessage: "The lookup function allEntries() does not accept any arguments.",
        },
        {
            in: `ancestors(x, invalidArgument=15)`,
            out: LookupParseError,
            errMessage: "The lookup function ancestors() does not accept more than one argument.",
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Attributes
        {
            in: `this.name`,
            out: new GetAttribute("name", new This()),
        },
        {
            in: `this.ancestors().first().name`,
            out: new GetAttribute("name", new First(new Ancestors(new This()))),
        },

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Complex test cases
        {
            in: `
                [
                    entry("tc-ec-cell-li"),
                    entry("tc-ec-cell"),
                ].map(apply=(e ->
                    e.annotate(
                        detail = e.ancestors().count()
                    )
                ))
            `,
            out: new Map(
                new List([
                    new EntryFunction(Str("tc-ec-cell-li")),
                    new EntryFunction(Str("tc-ec-cell")),
                ]),
                {
                    apply: new Lambda(
                        "e",
                        new Annotate(new Variable("e"), {
                            detail: new Count(new Ancestors(new Variable("e"))),
                        }),
                    ),
                },
            ),
            roundTripExact: false,
        },
    ];

    for (const toCheck of checks) {
        test(`Parsing: ${toCheck.in}`, () => {
            if (toCheck.out === LookupParseError) {
                assertThrows(
                    () => parseLookupString(toCheck.in),
                    LookupParseError,
                    toCheck.errMessage,
                );
            } else {
                const result = parseLookupString(toCheck.in);
                assertEquals(result, toCheck.out);

                // Make sure the toString() parses back to the same expression:
                const stringFromParsed = result.toString();
                try {
                    if (toCheck.roundTripExact !== false) {
                        // In this case, the result should exactly equal the original expression:
                        assertEquals(stringFromParsed, toCheck.in);
                    } else {
                        // In any other case, even if it doesn't exactly match, the toString() should parse to an exactly equal expression:
                        assertEquals(result, parseLookupString(stringFromParsed));
                    }
                } catch (err) {
                    console.log(`result.toString() gave: `, stringFromParsed);
                    throw new Error("Parse worked but round-trip parse failed", { cause: err });
                }
            }
        });
    }
});
