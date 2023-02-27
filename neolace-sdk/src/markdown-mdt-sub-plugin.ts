// deno-lint-ignore-file no-explicit-any
// Subscript and Superscript plugins for markdown-it
// Adapted from:
// https://github.com/markdown-it/markdown-it-sub/
// https://github.com/markdown-it/markdown-it-sup/
// Both Copyright (c) 2014-2015 Vitaly Puzrin, Alex Kocharin. MIT Licensed.

type MarkdownIt = any;
import type { ParserInline } from "./deps/markdown-it/ParserInline.ts";

// same as UNESCAPE_MD_RE plus a space
const UNESCAPE_RE = /\\([ \\!"#$%&'()*+,.\/:;<=>?@[\]^_`{|}~-])/g;

/**
 * markdown-it plugin that allows ~subscript~ and ^superscript^ tags in the Markdown
 */
export function SubPlugin(md: MarkdownIt): void {
    const subscript: ParserInline.RuleInline = (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        if (state.src.charCodeAt(start) !== 0x7E /* ~ */) return false;
        if (silent) return false; // don't run any pairs in validation mode
        if (start + 2 >= max) return false;

        state.pos = start + 1;

        let found = false;
        while (state.pos < max) {
            if (state.src.charCodeAt(state.pos) === 0x7E /* ~ */) {
                found = true;
                break;
            }

            state.md.inline.skipToken(state);
        }

        if (!found || start + 1 === state.pos) {
            state.pos = start;
            return false;
        }

        const content = state.src.slice(start + 1, state.pos);

        // don't allow unescaped spaces/newlines inside
        if (content.match(/(^|[^\\])(\\\\)*\s/)) {
            state.pos = start;
            return false;
        }

        // found!
        state.posMax = state.pos;
        state.pos = start + 1;

        // Earlier we checked !silent, but this implementation does not need it
        let token = state.push("sub_open", "sub", 1);
        token.markup = "~";

        token = state.push("text", "", 0);
        token.content = content.replace(UNESCAPE_RE, "$1");

        token = state.push("sub_close", "sub", -1);
        token.markup = "~";

        state.pos = state.posMax + 1;
        state.posMax = max;
        return true;
    };

    const superscript: ParserInline.RuleInline = (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        if (state.src.charCodeAt(start) !== 0x5E /* ^ */) return false;
        if (silent) return false; // don't run any pairs in validation mode
        if (start + 2 >= max) return false;

        state.pos = start + 1;

        let found = false;
        while (state.pos < max) {
            if (state.src.charCodeAt(state.pos) === 0x5E /* ^ */) {
                found = true;
                break;
            }

            state.md.inline.skipToken(state);
        }

        if (!found || start + 1 === state.pos) {
            state.pos = start;
            return false;
        }

        const content = state.src.slice(start + 1, state.pos);

        // don't allow unescaped spaces/newlines inside
        if (content.match(/(^|[^\\])(\\\\)*\s/)) {
            state.pos = start;
            return false;
        }

        // found!
        state.posMax = state.pos;
        state.pos = start + 1;

        // Earlier we checked !silent, but this implementation does not need it
        let token = state.push("sup_open", "sup", 1);
        token.markup = "^";

        token = state.push("text", "", 0);
        token.content = content.replace(UNESCAPE_RE, "$1");

        token = state.push("sup_close", "sup", -1);
        token.markup = "^";

        state.pos = state.posMax + 1;
        state.posMax = max;
        return true;
    };

    md.inline.ruler.after("emphasis", "sub", subscript);
    md.inline.ruler.after("emphasis", "sup", superscript);
}
