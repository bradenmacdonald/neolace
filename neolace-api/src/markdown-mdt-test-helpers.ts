export { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";
import type { AnyInlineNode, InlineNode, TopLevelNode } from "./markdown-mdt-ast.ts";
import type { Node, RootNode } from "./markdown-mdt.ts";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper methods

/** Helper method to generate the root node of a parsed Markdown tree */
export function doc(...n: TopLevelNode[]): RootNode {
    return { type: "mdt-document", children: n };
}
/** Helper method to generate a heading node, in the parsed Markdown tree */
export function heading(
    args: { level?: number; children?: Node[]; text?: string; slugId?: string } = {},
): TopLevelNode {
    if (args.text) {
        args.children = args.children || [];
        args.children.push(inlineText(args.text));
        delete args.text;
    }
    return { type: "heading", block: true, level: 1, children: [], slugId: "", ...args };
}
/** Helper method to generate an inline node, in the parsed Markdown tree */
export function inline(...nodes: AnyInlineNode[]): InlineNode {
    return { type: "inline", children: nodes };
}
/** Helper method to generate a text node, in the parsed Markdown tree */
export function text(text: string): AnyInlineNode {
    return { type: "text", text };
}
/** Helper method to generate an inline node containing text, in the parsed Markdown tree */
export function inlineText(content: string): InlineNode {
    return inline(text(content));
}
/** Helper method to generate a paraph node */
export function paragraph(...children: InlineNode[]): TopLevelNode {
    return { type: "paragraph", children, block: true };
}
/** Helper method to generate a lookup node, in the parsed Markdown tree */
export function lookup(content: string): AnyInlineNode {
    return { type: "lookup_inline", children: [{ type: "text", text: content }] };
}
/** Helper method to generate a lookup block node, in the parsed Markdown tree */
export function lookupBlock(content: string): TopLevelNode {
    return { type: "lookup_block", children: [{ type: "text", text: content }], block: true };
}
