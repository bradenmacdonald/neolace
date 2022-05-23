import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertNotEquals, assertThrows, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { LookupParseError } from "./errors.ts";
import type { LookupExpression } from "./expressions/base.ts";
import {
    Ancestors,
    AndAncestors,
    AndRelated,
    // Count,
    DateExpression,
    GetProperty,
    Graph,
    Image,
    List,
    LiteralExpression,
    This,
} from "./expressions.ts";
import * as V from "./values.ts";
import { parseLookupString } from "./parse.ts";

group("parse.ts", () => {
    // These tests just test parsing, so they don't use the database at all.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    function checkParse(original: string, expected: LookupExpression) {
        const parsed = parseLookupString(original);
        assertEquals(parsed, expected);
        // Now, since "original" was hand-written, we can't necessarily go from the parsed version to the original,
        // but we can ensure that the round trip: parse(x) === parse(parse(x).toString())
        try {
            const parsedRoundTrip = parseLookupString(parsed.toString());
            assertEquals(parsedRoundTrip, expected);
        } catch (err) {
            throw new Error("Parse worked but round-trip parse failed", { cause: err });
        }
    }

    test("Comparison of parsed expressions", () => {
        assertEquals(new This(), new This());
        assertEquals(new Ancestors(new This()), new Ancestors(new This()));
        assertNotEquals(new Ancestors(new This()), new AndAncestors(new This())); // Ancestors != AndAncestors
    });

    test("Invalid", () => {
        assertThrows(() => parseLookupString("foobar"), LookupParseError);
        assertThrows(() => parseLookupString(".ancestors()"), LookupParseError);
        assertThrows(() => parseLookupString(".count()"), LookupParseError);
        assertThrows(() => parseLookupString("count(.)"), LookupParseError);
        assertThrows(() => parseLookupString("count(foobar)"), LookupParseError);
        assertThrows(() => parseLookupString("unknownFunction()"), LookupParseError);
    });
    test("one argument functions", () => {
        checkParse("this.ancestors()", new Ancestors(new This()));
        checkParse(" this.ancestors( ) ", new Ancestors(new This()));
        checkParse("ancestors(this)", new Ancestors(new This()));
        checkParse(" ancestors( this ) ", new Ancestors(new This()));
        checkParse("this.andAncestors()", new AndAncestors(new This()));
        checkParse("andAncestors(this)", new AndAncestors(new This()));
        checkParse(" andAncestors( this ) ", new AndAncestors(new This()));
    });
    test("long chain", () => {
        checkParse(
            "this.andAncestors().andRelated().graph()",
            new Graph(new AndRelated(new AndAncestors(new This()), {})),
        );
        checkParse(
            "this.andAncestors().andRelated(depth=3).graph()",
            new Graph(
                new AndRelated(new AndAncestors(new This()), { depth: new LiteralExpression(new V.IntegerValue(3)) }),
            ),
        );
        checkParse(
            "graph(andRelated(andAncestors(this)))",
            new Graph(new AndRelated(new AndAncestors(new This()), {})),
        );
        checkParse(
            " this.andAncestors( ).andRelated( ).graph( )",
            new Graph(new AndRelated(new AndAncestors(new This()), {})),
        );
    });
    test("Date", () => {
        checkParse(`date("2017-06-01")`, new DateExpression(new LiteralExpression(new V.StringValue("2017-06-01"))));
        checkParse(
            ` date( "2017-06-01" ) `,
            new DateExpression(new LiteralExpression(new V.StringValue("2017-06-01"))),
        );
    });
    test("two argument functions", () => {
        checkParse(
            "this.get(prop=[[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]])",
            new GetProperty(new This(), {
                prop: new LiteralExpression(new V.PropertyValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd"))),
            }),
        );
        checkParse(
            `get(this, prop=[[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]])`,
            new GetProperty(new This(), {
                prop: new LiteralExpression(new V.PropertyValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd"))),
            }),
        );
        checkParse(
            "this.andAncestors().get(prop=[[/prop/_HASA]])",
            new GetProperty(new AndAncestors(new This()), {
                prop: new LiteralExpression(new V.PropertyValue(VNID("_HASA"))),
            }),
        );
    });
    test("three argument functions", () => {
        checkParse(
            `this.image(format="thumb", link=this)`,
            new Image(new This(), {
                format: new LiteralExpression(new V.StringValue("thumb")),
                link: new This(),
            }),
        );
        checkParse(
            `image(this, format="thumb", link=this)`,
            new Image(new This(), {
                format: new LiteralExpression(new V.StringValue("thumb")),
                link: new This(),
            }),
        );
    });
    test("four argument functions", () => {
        checkParse(
            `[[/entry/_4kfv0p8IFnzOOOdjmJRw4E]].image(format="logo", link="https://www.technotes.org/", maxWidth=60)`,
            new Image(new LiteralExpression(new V.EntryValue(VNID("_4kfv0p8IFnzOOOdjmJRw4E"))), {
                format: new LiteralExpression(new V.StringValue("logo")),
                link: new LiteralExpression(new V.StringValue("https://www.technotes.org/")),
                maxWidth: new LiteralExpression(new V.IntegerValue(60)),
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
