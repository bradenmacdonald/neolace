import { VNID } from "neolace/deps/vertex-framework.ts";
import { LookupParseError } from "./errors.ts";
import { LookupExpression } from "./expression.ts";
import {
    Ancestors,
    AndAncestors,
    // Count,
    List,
    LiteralExpression,
    Markdown,
    RelatedEntries,
    This,
} from "./expressions/index.ts";
import * as V from "./values.ts";


/**
 * Given a lookup expression as a string like
 *     this.andAncestors()
 * Parse it and return it as a LookupExpression object:
 *     new AndAncestors(new This());
 */
export function parseLookupString(lookup: string): LookupExpression {

    // To save time and make development faster, we are cheating with a working but very fake parser.
    // In the future this function should be replaced with a proper parser built using https://chevrotain.io/

    if (lookup === "null") { return new LiteralExpression(new V.NullValue()); }
    if (lookup === "this") { return new This(); }
    if (lookup === "this.ancestors()") { return new Ancestors(new This()); }
    if (lookup === "ancestors(this)") { return new Ancestors(new This()); }
    if (lookup === "this.andAncestors()") { return new AndAncestors(new This()); }
    if (lookup === "andAncestors(this)") { return new AndAncestors(new This()); }

    const otherTemplates: [RegExp, (match: RegExpMatchArray) => LookupExpression ][] = [
        // "foo" (String literal)
        [/^"(.*)"$/, _m => new LiteralExpression(new V.StringValue(JSON.parse(lookup)))],
        // 123 (Integer literal, supports bigints)
        [/^\d+$/, _m => new LiteralExpression(new V.IntegerValue(BigInt(lookup)))],
        // RT[_6FisU5zxXg5LcDz4Kb3Wmd] (Relationship Type literal)
        [/^RT\[(_[0-9A-Za-z]{1,22})\]$/, m => new LiteralExpression(new V.RelationshipTypeValue(VNID(m[1])))],
        // this.related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd], direction="from")
        [/^this\.related\(via=(.*), direction=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1]), direction: parseLookupString(m[2])})],
        // related(this, via=RT[_6FisU5zxXg5LcDz4Kb3Wmd], direction="to")
        [/^related\(this, via=(.*), direction=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1]), direction: parseLookupString(m[2])})],
        // this.related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^this\.related\(via=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1])})],
        // related(this, via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^related\(this, via=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1])})],
        // this.andAncestors().related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^this\.andAncestors\(\)\.related\(via=(.*)\)$/, m => new RelatedEntries(new AndAncestors(new This()), {via: parseLookupString(m[1])})],
        // related(andAncestors(this), via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^related\(andAncestors\(this\), via=(.*)\)$/, m => new RelatedEntries(new AndAncestors(new This()), {via: parseLookupString(m[1])})],
        // markdown("*string*")
        [/^markdown\((.*)\)$/, m => new Markdown( parseLookupString(m[1]) )],
    ];

    for (const [re, fn] of otherTemplates) {
        const matchResult = lookup.match(re);
        if (matchResult) {
            return fn(matchResult);
        }
    }

    if (lookup[0] === "[" && lookup[lookup.length - 1] === "]") {
        // It's a list:
        if (lookup.length === 2) {
            return new List([]);
        }
        const parts = lookup.substr(1, lookup.length - 2).split(",").map(part => part.trim());
        return new List(parts.map(part => parseLookupString(part)));
    }

    throw new LookupParseError(`Simple/fake parser is unable to parse the lookup expression "${lookup}"`);
}
