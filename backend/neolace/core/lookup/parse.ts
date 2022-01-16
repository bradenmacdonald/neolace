import { VNID } from "neolace/deps/vertex-framework.ts";
import { LookupParseError } from "./errors.ts";
import { LookupExpression } from "./expression.ts";
import {
    Ancestors,
    AndAncestors,
    AndDescendants,
    DateExpression,
    // Count,
    Descendants,
    GetProperty,
    Image,
    List,
    LiteralExpression,
    Markdown,
    ReverseProperty,
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

    lookup = lookup.trim();

    if (lookup === "null") { return new LiteralExpression(new V.NullValue()); }
    if (lookup === "this") { return new This(); }

    if (lookup === "this.ancestors()") { return new Ancestors(new This()); }
    if (lookup === "ancestors(this)") { return new Ancestors(new This()); }
    if (lookup === "this.andAncestors()") { return new AndAncestors(new This()); }
    if (lookup === "andAncestors(this)") { return new AndAncestors(new This()); }

    if (lookup === "this.descendants()") { return new Descendants(new This()); }
    if (lookup === "descendants(this)") { return new Descendants(new This()); }
    if (lookup === "this.andDescendants()") { return new AndDescendants(new This()); }
    if (lookup === "andDescendants(this)") { return new AndDescendants(new This()); }

    const otherTemplates: [RegExp, (match: RegExpMatchArray) => LookupExpression ][] = [
        // "foo" (String literal)
        [/^"(.*)"$/, _m => new LiteralExpression(new V.StringValue(JSON.parse(lookup)))],
        // 123 (Integer literal, supports bigints)
        [/^\d+$/, _m => new LiteralExpression(new V.IntegerValue(BigInt(lookup)))],
        // [[/entry/_6FisU5zxXg5LcDz4Kb3Wmd]] (Entry literal)
        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]$/, m => new LiteralExpression(new V.EntryValue(VNID(m[1])))],
        // [[/prop/_6FisU5zxXg5LcDz4Kb3Wmd]] (Property literal)
        [/^\[\[\/prop\/(_[0-9A-Za-z]{1,22})\]\]$/, m => new LiteralExpression(new V.PropertyValue(VNID(m[1])))],

        // this.get(prop=...)
        [/^this\.get\(prop=(.*)\)$/, m => new GetProperty(new This(), {propertyExpr: parseLookupString(m[1])})],
        // get(this, prop=...)
        [/^get\(this, prop=(.*)\)$/, m => new GetProperty(new This(), {propertyExpr: parseLookupString(m[1])})],
        // this.reverse(prop=...)
        [/^this\.reverse\(prop=(.*)\)$/, m => new ReverseProperty(new This(), {propertyExpr: parseLookupString(m[1])})],
        // reverse(this, prop=...)
        [/^reverse\(this, prop=(.*)\)$/, m => new ReverseProperty(new This(), {propertyExpr: parseLookupString(m[1])})],

        // this.andAncestors().get(prop=...)
        [/^this\.andAncestors\(\)\.get\(prop=(.*)\)$/, m => new GetProperty(new AndAncestors(new This()), {propertyExpr: parseLookupString(m[1])})],
        // get(andAncestors(this), prop=...)
        [/^get\(andAncestors\(this\), prop=(.*)\)$/, m => new GetProperty(new AndAncestors(new This()), {propertyExpr: parseLookupString(m[1])})],

        // this.andDescendants().reverse(prop=...)
        [/^this\.andDescendants\(\)\.reverse\(prop=(.*)\)$/, m => new ReverseProperty(new AndDescendants(new This()), {propertyExpr: parseLookupString(m[1])})],
        // reverse(andDescendants(this), prop=...)
        [/^reverse\(andDescendants\(this\), prop=(.*)\)$/, m => new ReverseProperty(new AndDescendants(new This()), {propertyExpr: parseLookupString(m[1])})],

        // [[/entry/...]].image(format="...")

        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]\.image\(format=(.*), link=(.*), maxWidth=(.*)\)$/, m => new Image(new LiteralExpression(new V.EntryValue(VNID(m[1]))), {formatExpr: parseLookupString(m[2]), linkExpr: parseLookupString(m[3]), maxWidthExpr: parseLookupString(m[4])})],
        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]\.image\(format=(.*), link=(.*)\)$/, m => new Image(new LiteralExpression(new V.EntryValue(VNID(m[1]))), {formatExpr: parseLookupString(m[2]), linkExpr: parseLookupString(m[3])})],
        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]\.image\(format=(.*), caption=(.*)\)$/, m => new Image(new LiteralExpression(new V.EntryValue(VNID(m[1]))), {formatExpr: parseLookupString(m[2]), captionExpr: parseLookupString(m[3])})],
        [/^\[\[\/entry\/(_[0-9A-Za-z]{1,22})\]\]\.image\(format=(.*)\)$/, m => new Image(new LiteralExpression(new V.EntryValue(VNID(m[1]))), {formatExpr: parseLookupString(m[2])})],

        // markdown("*string*")
        [/^markdown\((.*)\)$/, m => new Markdown( parseLookupString(m[1]) )],
        // date("*string*")
        [/^date\((.*)\)$/, m => new DateExpression( parseLookupString(m[1]) )],
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
