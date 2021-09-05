import { VNID } from "neolace/deps/vertex-framework.ts";
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


/**
 * Given a lookup expression as a string like
 *     this.andAncestors()
 * Parse it and return it as a QueryExpression object:
 *     new AndAncestors(new This());
 */
export function parseLookupString(lookup: string): QueryExpression {

    // To save time and make development faster, we are cheating with a working but very fake parser.
    // In the future this function should be replaced with a proper parser built using https://chevrotain.io/

    if (lookup === "this") { return new This(); }
    if (lookup === "this.ancestors()") { return new Ancestors(new This()); }
    if (lookup === "ancestors(this)") { return new Ancestors(new This()); }
    if (lookup === "this.andAncestors()") { return new AndAncestors(new This()); }
    if (lookup === "andAncestors(this)") { return new AndAncestors(new This()); }

    const otherTemplates: [RegExp, (match: RegExpMatchArray) => QueryExpression ][] = [
        // RT[_6FisU5zxXg5LcDz4Kb3Wmd] (Relationship Type literal)
        [/^RT\[(_[0-9A-Za-z]{1,22})\]$/, m => new LiteralExpression(new V.RelationshipTypeValue(VNID(m[1])))],
        // this.related(via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^this\.related\(via=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1])})],
        // related(this, via=RT[_6FisU5zxXg5LcDz4Kb3Wmd])
        [/^related\(this, via=(.*)\)$/, m => new RelatedEntries(new This(), {via: parseLookupString(m[1])})],
    ];

    for (const [re, fn] of otherTemplates) {
        const matchResult = lookup.match(re);
        if (matchResult) {
            return fn(matchResult);
        }
    }

    throw new QueryParseError(`Simple/fake parser is unable to parse the lookup expression "${lookup}"`);
}
