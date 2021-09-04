import { QueryParseError } from "./errors.ts";
import { QueryExpression } from "./expression.ts";
import {
    Ancestors,
    AndAncestors,
    // Count,
    // LiteralExpression,
    // RelatedEntries,
    This,
} from "./expressions/index.ts";


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

    throw new QueryParseError(`Simple/fake parser is unable to parse the lookup expression "${lookup}"`);
}
