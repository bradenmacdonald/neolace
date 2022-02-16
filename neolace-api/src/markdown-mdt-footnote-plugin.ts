// deno-lint-ignore-file no-explicit-any
// Footnote plugin for markdown-it
// Adapted from:
// https://github.com/markdown-it/markdown-it-footnote
// Both Copyright (c) 2014-2015 Vitaly Puzrin, Alex Kocharin. MIT Licensed.

type MarkdownIt = any;
import type { ParserBlock } from "./deps/markdown-it/ParserBlock.ts";
import type { ParserInline } from "./deps/markdown-it/ParserInline.ts";
import type { Token } from "./deps/markdown-it/Token.ts";

/**
 * markdown-it plugin that implements footnotes
 */
export function FootnotePlugin(md: MarkdownIt): void {
    const parseLinkLabel = md.helpers.parseLinkLabel;
    const isSpace = md.utils.isSpace;

    // Rendering functions removed - we only create an abstract syntax tree from the markdown and leave rendering to the clients.

    // Process footnote block definition
    const footnote_def: ParserBlock.RuleBlock = (state, startLine, endLine, silent) => {
        const start = state.bMarks[startLine] + state.tShift[startLine];
        const max = state.eMarks[startLine];

        // line should be at least 5 chars - "[^x]:"
        if (start + 4 > max) return false;

        if (state.src.charCodeAt(start) !== 0x5B /* [ */) return false;
        if (state.src.charCodeAt(start + 1) !== 0x5E /* ^ */) return false;

        let pos = start + 2;
        for (; pos < max; pos++) {
            if (state.src.charCodeAt(pos) === 0x20) return false;
            if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
                break;
            }
        }

        if (pos === start + 2) return false; // no empty footnote labels
        if (pos + 1 >= max || state.src.charCodeAt(++pos) !== 0x3A /* : */) return false;
        if (silent) return true;
        pos++;

        if (!state.env.footnotes) state.env.footnotes = {};
        if (!state.env.footnotes.refs) state.env.footnotes.refs = {};
        const label = state.src.slice(start + 2, pos - 2);
        state.env.footnotes.refs[":" + label] = -1;

        const openToken = new state.Token("footnote_reference_open", "", 1);
        openToken.meta = { label: label };
        openToken.level = state.level++;
        state.tokens.push(openToken);

        const oldBMark = state.bMarks[startLine];
        const oldTShift = state.tShift[startLine];
        const oldSCount = state.sCount[startLine];
        const oldParentType = state.parentType;

        const posAfterColon = pos;
        const initial = state.sCount[startLine] + pos - (state.bMarks[startLine] + state.tShift[startLine]);
        let offset = initial;

        while (pos < max) {
            const ch = state.src.charCodeAt(pos);

            if (isSpace(ch)) {
                if (ch === 0x09) {
                    offset += 4 - offset % 4;
                } else {
                    offset++;
                }
            } else {
                break;
            }

            pos++;
        }

        state.tShift[startLine] = pos - posAfterColon;
        state.sCount[startLine] = offset - initial;

        state.bMarks[startLine] = posAfterColon;
        state.blkIndent += 4;
        state.parentType = "footnote";

        if (state.sCount[startLine] < state.blkIndent) {
            state.sCount[startLine] += state.blkIndent;
        }

        state.md.block.tokenize(state, startLine, endLine, true);

        state.parentType = oldParentType;
        state.blkIndent -= 4;
        state.tShift[startLine] = oldTShift;
        state.sCount[startLine] = oldSCount;
        state.bMarks[startLine] = oldBMark;

        const closeToken = new state.Token("footnote_reference_close", "", -1);
        closeToken.level = --state.level;
        state.tokens.push(closeToken);

        return true;
    }

    /** Process inline footnotes (^[...])  */
    const footnote_inline: ParserInline.RuleInline = (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        if (start + 2 >= max) return false;
        if (state.src.charCodeAt(start) !== 0x5E /* ^ */) return false;
        if (state.src.charCodeAt(start + 1) !== 0x5B /* [ */) return false;

        const labelStart = start + 2;
        const labelEnd = parseLinkLabel(state, start + 1);

        // parser failed to find ']', so it's not a valid note
        if (labelEnd < 0) return false;

        // We found the end of the link, and know for a fact it's a valid link;
        // so all that's left to do is to call tokenizer.
        //
        if (!silent) {
            if (!state.env.footnotes) state.env.footnotes = {};
            if (!state.env.footnotes.list) state.env.footnotes.list = [];
            const footnoteId = state.env.footnotes.list.length;

            const tokens: Token[] = []
            state.md.inline.parse(
                state.src.slice(labelStart, labelEnd),
                state.md,
                state.env,
                tokens,
            );

            const token = state.push("footnote_ref", "", 0);
            token.meta = { id: footnoteId };

            state.env.footnotes.list[footnoteId] = {
                content: state.src.slice(labelStart, labelEnd),
                tokens: tokens,
            };
        }

        state.pos = labelEnd + 1;
        state.posMax = max;
        return true;
    }

    /** Process footnote references ([^...])  */
    const footnote_ref: ParserInline.RuleInline = (state, silent) => {
        const max = state.posMax;
        const start = state.pos;

        // should be at least 4 chars - "[^x]"
        if (start + 3 > max) return false;

        if (!state.env.footnotes || !state.env.footnotes.refs) return false;
        if (state.src.charCodeAt(start) !== 0x5B /* [ */) return false;
        if (state.src.charCodeAt(start + 1) !== 0x5E /* ^ */) return false;

        let pos = start + 2;
        for (; pos < max; pos++) {
            if (state.src.charCodeAt(pos) === 0x20) return false;
            if (state.src.charCodeAt(pos) === 0x0A) return false;
            if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
                break;
            }
        }

        if (pos === start + 2) return false; // no empty footnote labels
        if (pos >= max) return false;
        pos++;

        const label = state.src.slice(start + 2, pos - 1);
        if (typeof state.env.footnotes.refs[":" + label] === "undefined") return false;

        if (!silent) {
            if (!state.env.footnotes.list) state.env.footnotes.list = [];

            let footnoteId;
            if (state.env.footnotes.refs[":" + label] < 0) {
                footnoteId = state.env.footnotes.list.length;
                state.env.footnotes.list[footnoteId] = { label: label, count: 0 };
                state.env.footnotes.refs[":" + label] = footnoteId;
            } else {
                footnoteId = state.env.footnotes.refs[":" + label];
            }

            const footnoteSubId = state.env.footnotes.list[footnoteId].count;
            state.env.footnotes.list[footnoteId].count++;

            const token = state.push("footnote_ref", "", 0);
            token.meta = { id: footnoteId, subId: footnoteSubId, label: label };
        }

        state.pos = pos;
        state.posMax = max;
        return true;
    }

    // Glue footnote tokens to end of token stream
    function footnote_tail(state: any) {
        let current: Token[];
        let currentLabel: string;
        let insideRef = false;
        const refTokens: Record<string, Token[]> = {};

        if (!state.env.footnotes) return;

        state.tokens = state.tokens.filter(function (tok: Token) {
            if (tok.type === "footnote_reference_open") {
                insideRef = true;
                current = [];
                currentLabel = tok.meta.label;
                return false;
            }
            if (tok.type === "footnote_reference_close") {
                insideRef = false;
                // prepend ':' to avoid conflict with Object.prototype members
                refTokens[":" + currentLabel] = current;
                return false;
            }
            if (insideRef) current.push(tok);
            return !insideRef;
        });

        if (!state.env.footnotes.list) return;
        const list = state.env.footnotes.list;

        const openBlockToken = new state.Token("footnotes_open", "", 1);
        state.tokens.push(openBlockToken);

        let lastParagraph: Token|null = null;
        let tokens: Token[] = [];
        for (let i = 0, l = list.length; i < l; i++) {
            const openToken = new state.Token("footnote_open", "", 1);
            openToken.meta = { id: i, label: list[i].label };
            state.tokens.push(openToken);

            if (list[i].tokens) {
                tokens = [];

                const token1 = new state.Token("paragraph_open", "p", 1);
                token1.block = true;
                tokens.push(token1);

                const token2 = new state.Token("inline", "", 0);
                token2.children = list[i].tokens;
                token2.content = list[i].content;
                tokens.push(token2);

                const token3 = new state.Token("paragraph_close", "p", -1);
                token3.block = true;
                tokens.push(token3);
            } else if (list[i].label) {
                tokens = refTokens[":" + list[i].label];
            }

            if (tokens) state.tokens = state.tokens.concat(tokens);
            if (state.tokens[state.tokens.length - 1].type === "paragraph_close") {
                lastParagraph = state.tokens.pop();
            } else {
                lastParagraph = null;
            }

            const t = list[i].count > 0 ? list[i].count : 1;
            for (let j = 0; j < t; j++) {
                const anchorToken = new state.Token("footnote_anchor", "", 0);
                anchorToken.meta = { id: i, subId: j, label: list[i].label };
                state.tokens.push(anchorToken);
            }

            if (lastParagraph) {
                state.tokens.push(lastParagraph);
            }

            const closeToken = new state.Token("footnote_close", "", -1);
            state.tokens.push(closeToken);
        }

        const closeBlockToken = new state.Token("footnotes_close", "", -1);
        state.tokens.push(closeBlockToken);
    }

    md.block.ruler.before("reference", "footnote_def", footnote_def, { alt: ["paragraph", "reference"] });
    md.inline.ruler.after("image", "footnote_inline", footnote_inline);
    md.inline.ruler.after("footnote_inline", "footnote_ref", footnote_ref);
    md.core.ruler.after("inline", "footnote_tail", footnote_tail);
}
