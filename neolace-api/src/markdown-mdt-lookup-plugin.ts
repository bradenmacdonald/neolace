// deno-lint-ignore-file no-explicit-any
type MarkdownIt = any;
import type { ParserInline } from "./deps/markdown-it/ParserInline.ts";

// Character codes
const enum CharCode {
    LeftCurl = 0x7b,     // {
    RightCurl = 0x7d,    // }
    DoubleQuote = 0x22,  // "
    Backslash = 0x5c,    // \
}


/**
 * markdown-it plugin that parses both inline and block-level lookup
 * expressions, which are inside { curly braces }
 */
export function LookupExpressionPlugin(md: MarkdownIt): void {


    const tokenizeInline: ParserInline.RuleInline = (state, silent) => {
        // This rule only triggers when we encounter a { left curly brace
        if (state.src.charCodeAt(state.pos) !== CharCode.LeftCurl) { return false; }

        // scan along the string
        let pos = state.pos + 1;
        const stack = ["{"];
        for (; pos < state.posMax && stack.length != 0; pos++) {
            const ch = state.src.charCodeAt(pos);
            const mode = stack[stack.length - 1];
            if (mode === "{") {
                // We are presumably inside a lookup expression, looking for the closing }
                if (ch === CharCode.LeftCurl) {
                    stack.push("{");
                } else if (ch === CharCode.DoubleQuote) {
                    stack.push("\"");  // We are inside a string
                } else if (ch === CharCode.RightCurl) {
                    stack.pop();
                } else {
                    // Do nothing; this is just a regular part of the lookup expression
                }
            } else if (mode === "\"") {
                // We are inside a string
                if (ch === CharCode.Backslash) {
                    pos++;  // Ignore the next character (escaped)
                } else if (ch === CharCode.DoubleQuote) {
                    stack.pop();  // End of the quoted string
                } else {
                    // For any other character, including { and }, ignore it - it's just part of the string.
                }
            } else { throw new Error("Unexpected mode in lookup parse stack."); }
        }

        // Did we find all matching pairs and close the lookup expression?
        if (stack.length > 0) {
            // No we didn't. This is not a valid inline lookup expression
            return false;
        }
        // Yes we did:
        const lookupExpr = state.src.slice(state.pos + 1, pos - 1).trim();
        state.pos = pos;
        if (!silent) {
            const token = state.push('lookup_inline', 'code', 0);
            token.content = lookupExpr;
        }
        return true;
    };

    md.inline.ruler.push("lookup", tokenizeInline);
}
