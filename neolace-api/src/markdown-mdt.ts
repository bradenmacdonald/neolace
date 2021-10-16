// deno-lint-ignore-file no-explicit-any
import markdown from "./deps/markdown-it.min.js";
import type { Token } from "./deps/markdown-it/Token.ts";
import { Node, InlineNode, RootNode, AnyInlineNode, AnyBlockNode } from "./markdown-mdt-ast.ts";
export type { Node, InlineNode, RootNode, AnyInlineNode, AnyBlockNode }
import { SubPlugin } from "./markdown-mdt-sub-plugin.ts";
import { HeadingIdPlugin } from "./markdown-mdt-heading-id-plugin.ts";

const parser = markdown("commonmark", {
    breaks: false,  // Don't convert \n in paragraphs into <br>
    html: false,  // We don't allow arbitrary HTML
    linkify: false,  // Do not URL-like strings to links - they're ugly and likely spam
    typographer: false,  // (TM) → ™, (C) → ©, ... → …, and smart quotes, etc.
    xhtmlOut: false,  // Use HTML5, not XHTML
})
.disable("image") // Disable inline images
.enable("strikethrough") // Enable ~~strikethrough~~
.enable("table") // Enable tables (GitHub-style)
.use(HeadingIdPlugin) // Give each heading an ID
.use(SubPlugin); // Allow use of <sub> and <sup> tags


export interface Options {
    inline?: boolean;
}


export function tokenizeMDT(mdtString: string, options: Options = {}): RootNode {
    const env = {};
    const tokens = options.inline ? parser.parseInline(mdtString, env) : parser.parse(mdtString, env);

    return buildAST(tokens);
}

export function tokenizeInlineMDT(mdtString: string): InlineNode {
    const root = tokenizeMDT(mdtString, {inline: true});
    if (root.children.length !== 1) {
        throw new Error(`Expected a single inline node from MDT document.`);
    }
    const childNode = root.children[0];
    if (childNode.type !== "inline") {
        throw new Error(`Expected a single inline node from MDT document, got ${childNode.type}.`);
    }
    return childNode;
}

/**
 * Compile the Token stream produced by markdown-it's parser into a more useful tree
 */
function buildAST(tokens: Token[]): RootNode {
    const root: RootNode = {
        type: "mdt-document",
        children: [],
    };

    let currNode: Node = root as any as Node;
    const stack: Node[] = [];

    const addChild = (node: Node): void => {
        if ((currNode as any).children === undefined) {
            throw new Error(`Tried to add child ${JSON.stringify(node)} to node ${JSON.stringify(currNode)} which is missing .children = []`);
        }
        (currNode as any).children?.push(node);
    }

    const pushTokens = (token: Token): void => {
        if (token.hidden) {
            return;  // Ignore "hidden" tokens, i.e. paragraphs that wrap list items
        } else if (token.type === "text" && token.content === "") {
            return;  // Special case: elide empty text nodes.
        }

        const type = getTokenType(token);

        if (type === "inline") {
            const inlineNode = tokenToNode(token);
            addChild(inlineNode);
            stack.push(currNode);
            currNode = inlineNode;
            token.children?.forEach(pushTokens);
            const poppedNode = stack.pop();
            if (!poppedNode) {
                throw new Error("AST stack underflow.");
            }
            currNode = poppedNode;
        } else if (token.nesting == 1) {
            const child = tokenToNode(token);
            addChild(child);
            stack.push(currNode);
            currNode = child;
        } else if (token.nesting == -1) {
            const poppedNode = stack.pop();
            if (!poppedNode) {
                throw new Error("AST stack underflow.");
            }
            if (type !== currNode.type) {
                throw new Error(`Token mismatch: got ${type} but was expecting ${currNode.type}_close`);
            }
            currNode = poppedNode;
        } else if (token.nesting == 0) {
            const node = tokenToNode(token);
            addChild(node);
        } else {
            throw new Error(`Invalid nesting level found in AST token.`);
        }
    };

    tokens.forEach(pushTokens);

    if (stack.length !== 0) {
        throw new Error("MDT Parse Error: Unbalanced block open/close tokens");
    }

    return root;
}

function getTokenType(token: Token): Node["type"] {
    let type: string;
    if (token.nesting === 1 && token.type.endsWith("_open")) {
        type = token.type.slice(0, -5);
    } else if (token.nesting === -1 && token.type.endsWith("_close")) {
        type = token.type.slice(0, -6);
    } else { type = token.type; }

    // Conversions:
    if (type === "fence") {
        type = "code_block";
    }

    return type as Node["type"];
}

function tokenToNode(token: Token): Node {
    const type = getTokenType(token);

    const node: any = {
        type,
    };

    // Block attribute:
    if (token.block && node.type !== "inline") {
        node.block = true;
    }

    // Content/children attributes:
    if (type === "text" || type === "code_inline" || type === "code_block") {
        // This node contains text content:
        node.content = token.content;
    } else {
        // Otherwise it might contain child nodes:
        if (token.content) {
            // Just check to make sure we're not forgetting some node type that has content:
            if (type === "inline") {
                // Ignore content on inline token - its child tokens have all the same content.
            } else {
                throw new Error(`Unexpected content: ${JSON.stringify(token)}`);
            }
        }
        // Create "children" attribute for this node:
        if (type !== "softbreak" && type !== "hardbreak" && type !== "hr") {
            node.children = [];
        }
    }

    // Special case handling:
    if (type === "link") {
        const href = token.attrGet("href") ?? "";
        node.href = href;
    } else if (type === "heading") {
        // Determine the heading level from the tag, e.g. "h2" -> 2
        node.level = parseInt(token.tag.slice(1), 10);
        node.slugId = token.attrGet("slugId");  // From out "heading ID" plugin
    } else if (type === "ordered_list") {
        const listStart = token.attrGet("start");
        if (listStart) {
            node.start = parseInt(listStart, 10);
        }
    } else if (type === "td" || type === "th") {
        const style = token.attrGet("style");
        if (style === "text-align:right") {
            node.align = "right";
        } else if (style === "text-align:center") {
            node.align = "center";
        }
    }

    return node as Node;
}

export function renderInlineToHTML(inlineNode: Node): string {
    if (inlineNode.type !== "inline") {
        throw new Error(`renderInlineToHTML() can only render inline nodes to HTML, not ${inlineNode}`);
    }
    let html = "";
    const renderNode = (childNode: typeof inlineNode["children"][0]): void => {
        if (childNode.type === "text") {
            html += parser.utils.escapeHtml(childNode.content);
            return;
        } else if (childNode.type === "code_inline") {
            html += "<code>" + parser.utils.escapeHtml(childNode.content) + "</code>";
            return;
        } else if (childNode.type === "softbreak") {
            html += "\n";
            return;
        } else if (childNode.type === "hardbreak") {
            html += "<br>";
            return;
        }
        let start = "", end = "";
        switch (childNode.type) {
            case "strong":
            case "em":
            case "sup":
            case "sub": 
            case "s": {
                start = `<${childNode.type}>`, end = `</${childNode.type}>`;
                break;
            }
            case "link": {
                start = `<a href="${childNode.href}">`;
                end = "</a>"
                break;
            }
        }
        html += start;
        // if ("children" in childNode) {
        childNode.children.forEach(renderNode);
        // }
        html += end;
    };
    inlineNode.children.forEach(renderNode);
    return html;
}

/**
 * Render inline MDT to a single line of plain text, ignoring all formatting like bold, links, etc.
 * @param inlineNode 
 * @returns a plain text string
 */
export function renderInlineToPlainText(inlineNode: Node): string {
    if (inlineNode.type !== "inline") {
        throw new Error(`renderInlineToPlainText() can only render inline nodes to plain text, not ${inlineNode}`);
    }
    let text = "";
    const renderNode = (childNode: typeof inlineNode["children"][0]): void => {
        if (childNode.type === "text") {
            text += childNode.content;
            return;
        } else if (childNode.type === "code_inline") {
            text += childNode.content;
            return;
        } else if (childNode.type === "softbreak" || childNode.type === "hardbreak") {
            text += "\n";
            return;
        }
        // If we get here, this is a strong, em, sup, sub, s, or link; just render its text
        childNode.children.forEach(renderNode);
    };
    inlineNode.children.forEach(renderNode);
    return text;
}

/**
 * Render MDT to HTML, ignoring block-level elements.
 * @param mdt The MDT string to parse and convert to HTML
 */
export function renderMDTInlineToHTML(mdt: string): string {
    const document = tokenizeMDT(mdt, {inline: true});
    return document.children.map(node => {
        if (node.type !== "inline") { throw new Error(`Unexpected node type ${node.type} when parsing MDT as inline-only.`); }
        return renderInlineToHTML(node);
    }).join("");
}
