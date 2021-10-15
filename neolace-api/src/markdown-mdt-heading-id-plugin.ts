// deno-lint-ignore-file no-explicit-any
type MarkdownIt = any;
import type { Token } from "./deps/markdown-it/Token.ts";

const idCacheKey = Symbol("idCache");

/**
 * A plugin for markdown-it that gives each "heading" node a unique friendly slug like "heading-text".
 */
export function HeadingIdPlugin(md: MarkdownIt): void {

    const generateHeadingId = (state: any) => {

        const idCache: Set<string> = state[idCacheKey] ?? (state[idCacheKey] = new Set());

        state.tokens.forEach(function (token: Token, i: number) {
            if (token.type === 'heading_open') {
                const text = md.renderer.render(state.tokens[i + 1].children, md.options)
                const slugId = makeUnique(slugify(text));
                token.attrSet("slugId", slugId);
            }
        });

        function makeUnique(id: string) {
            if (!idCache.has(id)) {
                idCache.add(id);
                return id;
            }
            let i = 1;
            while (idCache.has(`${id}-${i}`)) { i++; }
            return `${id}-${i}`;
        }
    }

    md.core.ruler.push("named_headings", generateHeadingId);
}

/** regex to match any character that is not allowed as a slug (but allows uppercase) */
// deno-lint-ignore no-invalid-regexp
const notSlugRegex = /[^-\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/ug;

/**
 * Slugify a string, e.g. "Drive Shaft" to "drive-shaft".
 * Allows "letters and numbers" (in any language) in the slug.
 * @param string The string to slugify
 */
function slugify(string: string): string {
    string = string.toLowerCase().trim(); // convert to lowercase
    string = string.replace(notSlugRegex, " ");
    string = string.replace(/[-\s]+/g, "-"); // convert spaces to hyphens, eliminate consecutive spaces/hyphens
    string = string.replace(/-+$/g, ""); // trim any trailing hyphens
    return string;
}

