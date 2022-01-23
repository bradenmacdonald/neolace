import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertNotEquals, assertThrows, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { LookupParseError } from "./errors.ts";
import { LookupExpression } from "./expression.ts";
import {
    Ancestors,
    AndAncestors,
    // Count,
    DateExpression,
    GetProperty,
    List,
    LiteralExpression,
    This,
} from "./expressions/index.ts";
import * as V from "./values.ts";
import { parseLookupString } from "./parse.ts";

group(import.meta, () => {
    // These tests just test parsing, so they don't use the database at all.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    function checkParse(original: string, expected: LookupExpression) {
        const parsed = parseLookupString(original);
        assertEquals(parsed, expected);
        // Now, since "original" was hand-written, we can't necessarily go from the parsed version to the original,
        // but we can ensure that the round trip: parse(x) === parse(parse(x).toString())
        const parsedRoundTrip = parseLookupString(parsed.toString());
        assertEquals(parsedRoundTrip, expected);
    }

    test("Comparison of parsed expressions", () => {
        assertEquals(new This(), new This());
        assertEquals(new Ancestors(new This()), new Ancestors(new This()));
        assertNotEquals(new Ancestors(new This()), new AndAncestors(new This())); // Ancestors != AndAncestors
    });

    test("Invalid", () => {
        assertThrows(() => parseLookupString("foobar"), LookupParseError);
    });
    test("Ancestors", () => {
        checkParse("this.ancestors()", new Ancestors(new This()));
        checkParse("ancestors(this)", new Ancestors(new This()));
        checkParse("this.andAncestors()", new AndAncestors(new This()));
        checkParse("andAncestors(this)", new AndAncestors(new This()));
    });
    test("Date", () => {
        checkParse(`date("2017-06-01")`, new DateExpression(new LiteralExpression(new V.StringValue("2017-06-01"))));
    });
    test("GetProperty - get(...)", () => {
        checkParse(
            "this.get(prop=[[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]])",
            new GetProperty(new This(), {
                propertyExpr: new LiteralExpression(new V.PropertyValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd"))),
            }),
        );
        checkParse(
            `get(this, prop=[[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]])`,
            new GetProperty(new This(), {
                propertyExpr: new LiteralExpression(new V.PropertyValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd"))),
            }),
        );
        checkParse(
            "this.andAncestors().get(prop=[[/prop/_HASA]])",
            new GetProperty(new AndAncestors(new This()), {
                propertyExpr: new LiteralExpression(new V.PropertyValue(VNID("_HASA"))),
            }),
        );
    });
    test("List", () => {
        checkParse("[]", new List([]));
        checkParse(
            `[null, 1, "hello"]`,
            new List([
                new LiteralExpression(new V.NullValue()),
                new LiteralExpression(new V.IntegerValue(1)),
                new LiteralExpression(new V.StringValue("hello")),
            ]),
        );
    });
});
