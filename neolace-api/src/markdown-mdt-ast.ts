/**
 * When MDT is parsed, we built an abstract sytnax tree (AST) of the document.
 */

///////// Inline Nodes

/** Any inline node types (text, link, strong, etc.) are always children of an "inline" node. */
export interface InlineNode {
    type: "inline";
    children: AnyInlineNode[];
}

interface TextNode {
    type: "text";
    /** UNESCAPED text content - may contain HTML. You must escape this before rendering. */
    content: string;
}
interface InlineCodeNode {
    type: "code_inline";
    /** UNESCAPED text content - may contain HTML. You must escape this before rendering. */
    content: string;
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


export type AnyInlineNode = (
    | TextNode
    | InlineCodeNode
    | StrongNode
    | EmphasisNode
    | LinkNode
    | SubscriptNode
    | SuperscriptNode
    | SoftBreakNode
    | HardBreakNode
    | StrikeThroughNode
);

///////// Block Nodes

interface BlockNode {
    block: true,
}

interface ParagraphNode extends BlockNode {
    type: "paragraph";
    children: Node[];
}
interface HeadingNode extends BlockNode {
    type: "heading";
    /** 1 for top-level heading (<h1>), 2 for <h2>, etc. */
    level: number;
    children: Node[];
}
interface BlockquoteNode extends BlockNode {
    type: "blockquote";
    children: Node[];
}
interface CodeBlockNode extends BlockNode {
    type: "code_block";
    /** UNESCAPED text content - may contain HTML. You must escape this before rendering. */
    content: string;
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

// Tables:

interface TableNode extends BlockNode { type: "table"; children: (TableHeadNode|TableBodyNode)[]; }
interface TableBodyNode extends BlockNode { type: "tbody"; children: TableRowNode<TableDataNode>[]; }
interface TableHeadNode extends BlockNode { type: "thead"; children: TableRowNode<TableHeadingNode>[]; }
interface TableRowNode<RowType> extends BlockNode { type: "tr", children: RowType[]; }
interface TableDataNode extends BlockNode { type: "td", children: Node[]; align?: "left"|"center"|"right"; }
interface TableHeadingNode extends BlockNode { type: "th", children: Node[]; align?: "left"|"center"|"right"; }

export type AnyBlockNode = (
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | CodeBlockNode
    | BulletListNode
    | OrderedListNode
    | ListItemNode
    | HorizontalRuleNode
    | TableNode
    | TableBodyNode
    | TableHeadNode
    | TableRowNode<TableDataNode|TableHeadingNode>
    | TableDataNode
    | TableHeadingNode
    // TODO: Images
    // TODO: TechNotes-specific elements
);

// All node types:
export type Node = AnyInlineNode | InlineNode | AnyBlockNode;

// The nodes that can occur at the top level of a document:
export type TopLevelNode = (
    | InlineNode
    | ParagraphNode
    | HeadingNode
    | BlockquoteNode
    | CodeBlockNode
    | BulletListNode
    | OrderedListNode
    | HorizontalRuleNode
    | TableNode
);

export interface RootNode {
    type: "mdt-document";
    children: TopLevelNode[];
}
