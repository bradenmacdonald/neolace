/**
 * When MDT is parsed, we built an abstract sytnax tree (AST) of the document.
 */

///////// Inline Nodes

/** Any inline node types (text, link, strong, etc.) are always children of an "inline" node. */
export interface InlineNode {
    type: "inline";
    children: AnyInlineNode[];
}

export interface TextNode {
    type: "text";
    /** UNESCAPED text content - may contain HTML. You must escape this before rendering. */
    text: string;
}
interface InlineCodeNode {
    type: "code_inline";
    /**
     * Always contains a single child node, of type TextNode.
     * We do this instead of a direct .text/.content property because this way is more compatible with Slate.js
     */
    children: [TextNode];
}
export interface InlineLookupNode {
    type: "lookup_inline";
    /** The lookup expression, within a single child node, of type TextNode */
    children: [TextNode];
}
interface LinkNode {
    type: "link";
    href: string;
    children: AnyInlineNode[];
}
interface StrongNode {
    type: "strong";
    children: AnyInlineNode[];
}
interface EmphasisNode {
    type: "em";
    children: AnyInlineNode[];
}
interface SubscriptNode {
    type: "sub";
    children: AnyInlineNode[];
}
interface SuperscriptNode {
    type: "sup";
    children: AnyInlineNode[];
}
interface StrikeThroughNode {
    type: "s";
    children: AnyInlineNode[];
}
/**
 * A regular line break (not in a code span or HTML tag) that is not preceded by two or more spaces is parsed as a
 * softbreak. (A softbreak may be rendered in HTML either as a line ending or as a space. The result will be the same
 * in browsers.)
 * https://spec.commonmark.org/0.29/#soft-line-breaks
 */
interface SoftBreakNode {
    type: "softbreak";
}
/** Hard break: <br> - https://spec.commonmark.org/0.29/#hard-line-breaks */
interface HardBreakNode {
    type: "hardbreak";
}
/** A reference to a footnote, when collectFootnotes is enabled */
interface FootnoteRefNode {
    type: "footnote_ref";
    /** The displayed text for this reference, e.g. [1] */
    referenceText: string;
    footnoteId: number;
    /** The ID of this reference to the footnote. If there are multiple references to the same footnote, they'll have different anchorIds. */
    anchorId: string;
}
/** An inline footnote; only used when collectFootnotes is NOT enabled */
interface InlineFootnoteNode {
    type: "footnote_inline";
    children: AnyInlineNode[];
}
/**
 * A node type that isn't natively used by MDT but which allows applications to extend the use of MDT AST for other
 * purposes, e.g. to support functionality in WYSIWYG editors.
 */
export interface CustomInlineNode {
    type: `custom-${string}`;
    block?: never;
    children?: AnyInlineNode[];
}

export type AnyInlineNode =
    | TextNode
    | InlineCodeNode
    | InlineLookupNode
    | StrongNode
    | EmphasisNode
    | LinkNode
    | SubscriptNode
    | SuperscriptNode
    | SoftBreakNode
    | HardBreakNode
    | StrikeThroughNode
    | FootnoteRefNode
    | InlineFootnoteNode
    | CustomInlineNode;

///////// Block Nodes

export interface BlockNode {
    block: true;
}

export interface ParagraphNode extends BlockNode {
    type: "paragraph";
    children: Node[];
}
interface HeadingNode extends BlockNode {
    type: "heading";
    /** 1 for top-level heading (<h1>), 2 for <h2>, etc. */
    level: number;
    /** A friendly, unique slug ID, e.g. if the heading is "Heading 1", this would be "heading-1" */
    slugId: string;
    children: Node[];
}
interface BlockquoteNode extends BlockNode {
    type: "blockquote";
    children: Node[];
}
interface CodeBlockNode extends BlockNode {
    type: "code_block";
    /** Always contains a single child node, of type TextNode */
    children: [TextNode];
}
interface LookupBlockNode extends BlockNode {
    type: "lookup_block";
    /** The lookup expression, within a single child node, of type TextNode */
    children: [TextNode];
}
interface BulletListNode extends BlockNode {
    type: "bullet_list";
    children: ListItemNode[];
}
interface OrderedListNode extends BlockNode {
    type: "ordered_list";
    /** Start this list at a number other than 1 */
    start?: number;
    children: ListItemNode[];
}
interface ListItemNode extends BlockNode {
    type: "list_item";
    children: Node[];
}
interface HorizontalRuleNode extends BlockNode {
    type: "hr";
}
/**
 * When in block mode with collectFootnotes = true, the resulting
 * document.footnotes will be an array of these nodes.
 */
export interface FootnoteNode extends BlockNode {
    type: "footnote";
    id: number;
    label?: string;
    /** anchorIds of all the references to this footnote */
    anchors: string[];
    children: Node[];
}
export interface CustomBlockNode {
    type: `custom-${string}`;
    children?: AnyInlineNode[];
}

// Tables:

interface TableNode extends BlockNode {
    type: "table";
    children: (TableHeadNode | TableBodyNode)[];
}
interface TableBodyNode extends BlockNode {
    type: "tbody";
    children: TableRowNode<TableDataNode>[];
}
interface TableHeadNode extends BlockNode {
    type: "thead";
    children: TableRowNode<TableHeadingNode>[];
}
interface TableRowNode<RowType> extends BlockNode {
    type: "tr";
    children: RowType[];
}
interface TableDataNode extends BlockNode {
    type: "td";
    children: Node[];
    align?: "left" | "center" | "right";
}
interface TableHeadingNode extends BlockNode {
    type: "th";
    children: Node[];
    align?: "left" | "center" | "right";
}

export type AnyBlockNode =
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | CodeBlockNode
    | LookupBlockNode
    | BulletListNode
    | OrderedListNode
    | ListItemNode
    | HorizontalRuleNode
    | TableNode
    | TableBodyNode
    | TableHeadNode
    | TableRowNode<TableDataNode | TableHeadingNode>
    | TableDataNode
    | TableHeadingNode
    | CustomBlockNode;

// All node types:
export type Node = AnyInlineNode | InlineNode | AnyBlockNode | FootnoteNode;

// The nodes that can occur at the top level of a document:
export type TopLevelNode =
    | InlineNode
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | CodeBlockNode
    | LookupBlockNode
    | BulletListNode
    | OrderedListNode
    | HorizontalRuleNode
    | TableNode;

export interface RootNode {
    type: "mdt-document";
    children: TopLevelNode[];
    footnotes?: FootnoteNode[];
}
