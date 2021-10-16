// deno-lint-ignore-file no-explicit-any
type MarkdownIt = any;
import type { ParserInline } from "./deps/markdown-it/ParserInline.ts";
import type { Token } from "./deps/markdown-it/Token.ts";

// Character codes
const enum CharCode {
    LessThan = 0x3c,     // <
    GreaterThan = 0x3e,  // >
    Slash = 0x2f,        // /
    B     = 0x42,
    b     = 0x62,
    P     = 0x50,
    p     = 0x70,
    S     = 0x53,
    s     = 0x73,
    U     = 0x55,
    u     = 0x75,
}
const enum TokenType {
    StartSup = "sup_open",
    StartSub = "sub_open",
    EndSup = "sup_close",
    EndSub = "sub_close",
}

/**
 * markdown-it plugin that allows <sub> and <sup> tags in the Markdown
 */
export function SubPlugin(md: MarkdownIt): void {

    const tokenize: ParserInline.RuleInline = (state, silent) => {
        const {pos, posMax} = state;
        // Is this the start of an HTML <tag> ?
        if (state.src.charCodeAt(pos) !== CharCode.LessThan) {
            return false;
        }
        // Is this a <sub> or <sup> opening tag or a </sub> or </sup> closing tag?
        const isClosing = (state.src.charCodeAt(pos + 1) === CharCode.Slash); // Note this may be out of bounds but that's OK
        const tagLength = isClosing ? 6 : 5;  // Length of "<su_>" or "</su_>" that we may be parsing
        // Is there enough room for the <sub>, </sub>, <sup>, or </sup> that we may be parsing now?
        if (pos + tagLength > posMax) {
            return false;
        }
        // Index of the 's' in <sub>,<sup>,</sup>,</sub>
        const sPos = pos + (isClosing ? 2 : 1);
        // Check that the next few chars are "sub>" or "sup>"
        if (state.src.charCodeAt(sPos) !== CharCode.s && state.src.charCodeAt(sPos) !== CharCode.S) { return false; }
        if (state.src.charCodeAt(sPos+1) !== CharCode.u && state.src.charCodeAt(sPos+1) !== CharCode.U) { return false; }
        const isSub = (state.src.charCodeAt(sPos+2) === CharCode.b || state.src.charCodeAt(sPos+2) === CharCode.B);
        const isSup = (state.src.charCodeAt(sPos+2) === CharCode.p || state.src.charCodeAt(sPos+2) === CharCode.P);
        if (!isSub && !isSup) { return false; }
        if (state.src.charCodeAt(sPos+3) !== CharCode.GreaterThan) { return false; }

        // Validate that we're not already in a <sub> or <sup>, or that we are if isClosing
        const tag = isSub ? "sub" : "sup";
        const startType = isSub ? TokenType.StartSub : TokenType.StartSup;
        const endType = isSub ? TokenType.EndSub : TokenType.EndSup;
        let lastToken: Token|undefined;
        for (let i = state.tokens.length - 1; i > 0; i--) {
            if (
                state.tokens[i].type === TokenType.StartSup ||
                state.tokens[i].type === TokenType.StartSub ||
                state.tokens[i].type === TokenType.EndSup ||
                state.tokens[i].type === TokenType.EndSub
            ) {
                lastToken = state.tokens[i];
                break;
            }
        }
        if (isClosing) {
            // If this is a closing tag, it must have a matching start tag
            if (lastToken === undefined || lastToken.type !== startType) {
                return false;
            }
        } else {
            // If this is an opening tag, the last tag must not be a start tag
            if (lastToken !== undefined && (lastToken.type === TokenType.StartSup || lastToken.type === TokenType.StartSub)) {
                return false;
            }
            // And we must look ahead to ensure there's a closing tag.
            if (state.src.slice(sPos, posMax).search(new RegExp(`[^\\\\]</${tag}>`, "i")) === -1) {
                return false;
            }
        }

        if (!silent) {
            if (isClosing) {
                state.push(endType, tag, -1);
            } else {
                state.push(startType, tag, 1);
            }
        }
        state.pos += tagLength;
        return true;
    }

    md.inline.ruler.push("subsup", tokenize);
}
