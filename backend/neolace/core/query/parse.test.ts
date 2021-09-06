import { VNID } from "neolace/deps/vertex-framework.ts";
import { group, test, setTestIsolation, assertEquals, assertThrows, assertNotEquals } from "neolace/lib/tests.ts";
import { QueryParseError } from "./errors.ts";
import { QueryExpression } from "./expression.ts";
import {
    Ancestors,
    AndAncestors,
    // Count,
    LiteralExpression,
    RelatedEntries,
    This,
} from "./expressions/index.ts";
import * as V from "./values.ts";
import { parseLookupString } from "./parse.ts";


group(import.meta, () => {

    // These tests just test parsing, so they don't use the database at all.
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    function checkParse(original: string, expected: QueryExpression) {
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
        assertNotEquals(new Ancestors(new This()), new AndAncestors(new This()));  // Ancestors != AndAncestors
    });

    test("Invalid", () => {
        assertThrows(() => parseLookupString("foobar"), QueryParseError);
    });
    test("Ancestors", () => {
        checkParse("this.ancestors()", new Ancestors(new This()));
        checkParse("ancestors(this)", new Ancestors(new This()));
        checkParse("this.andAncestors()", new AndAncestors(new This()));
        checkParse("andAncestors(this)", new AndAncestors(new This()));
    });
    test("Related", () => {
        checkParse(
            "this.related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])",
            new RelatedEntries(new This(), {via: new LiteralExpression(new V.RelationshipTypeValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd")))}),
        );
        checkParse(
            `this.related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd], direction="from")`,
            new RelatedEntries(new This(), {
                via: new LiteralExpression(new V.RelationshipTypeValue(VNID("_6FisU5zxXg5LcDz4Kb3Wmd"))),
                direction: new LiteralExpression(new V.StringValue("from")),
            }),
        );
        checkParse(
            "this.andAncestors().related(via=RT[_HASA])",
            new RelatedEntries(new AndAncestors(new This()), {via: new LiteralExpression(new V.RelationshipTypeValue(VNID("_HASA")))}),
        );
    });

});
