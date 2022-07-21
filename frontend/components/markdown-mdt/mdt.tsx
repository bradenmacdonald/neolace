import React from "react";
import Link from "next/link";
import { api } from "lib/api-client";
import { EntryLink } from "components/EntryLink";
import { MDT, VNID } from "neolace-api";
import { LookupValue } from "components/LookupValue";
import { FormattedMessage } from "react-intl";
import { HoverClickNote } from "components/widgets/HoverClickNote";

const footnotes = Symbol("footnotes");

interface MDTContextArgs {
    entryId?: VNID | undefined;
    refCache?: api.ReferenceCacheData;
    headingShift?: number;
    [footnotes]?: MDT.RootNode["footnotes"];
    disableInteractiveFeatures?: boolean;
}

/**
 * Context data for rendering all the MDT (markdown) on a page.
 *
 * This should have (read-only) data about all the links that occur in the MDT content, and is also updated while the
 * markdown is rendered to keep track of things like whether or not a given link is being seen for the first time on the
 * current page.
 */
export class MDTContext {
    /** The ID of the current entry, if relevant. */
    readonly entryId: VNID | undefined;
    /** Reference cache: has details of any entries, properties, entry types, or lookup expressions that are needed. */
    readonly refCache: api.ReferenceCacheData;
    /** Decrease the size of the headings by this number (1 means <h1> becomes <h2>, etc.) */
    readonly headingShift: number;
    /**
     * List of footnotes for this document/entry, in case any are references inline and we want to display them.
     * You cannot set this directly; it is set by <RenderMDT/> only.
     */
    readonly [footnotes]?: MDT.RootNode["footnotes"];
    /**
     * Disable links, footnotes, and hover previews (tooltips that appear when you hover over an entry reference).
     * Used in tooltips and dropdowns to prevent unwanted links or tooltips-within-tooltips
     */
    readonly disableInteractiveFeatures: boolean;

    constructor(args: MDTContextArgs) {
        this.entryId = args.entryId;
        // If no reference cache is available, create an empty one for consistency.
        this.refCache = args.refCache ?? { entries: {}, entryTypes: {}, properties: {}, lookups: [] };
        this.headingShift = args.headingShift ?? 0;
        this[footnotes] = args[footnotes];
        this.disableInteractiveFeatures = args.disableInteractiveFeatures ?? false;
    }

    public childContextWith(args: MDTContextArgs) {
        const entryId = "entryId" in args ? args.entryId : this.entryId;
        return new MDTContext({
            entryId,
            refCache: args.refCache ?? this.refCache,
            headingShift: this.headingShift + (args.headingShift ?? 0),
            [footnotes]: args[footnotes] ?? (entryId === this.entryId ? this[footnotes] : undefined),
            disableInteractiveFeatures: args.disableInteractiveFeatures ?? this.disableInteractiveFeatures,
        });
    }
}

interface InlineProps {
    mdt: string | MDT.InlineNode;
    context: MDTContext;
    children?: never;
}

/**
 * Render some MDT (Markdown) in inline mode, which doesn't allow block elements like headings or images, but does
 * support rich text, links, etc.
 */
export const InlineMDT: React.FunctionComponent<InlineProps> = (props) => {
    // If we've been given an MDT string instead of a syntax tree, parse it, but only do so once:
    const inlineNode: MDT.InlineNode = React.useMemo(() => (
        typeof props.mdt === "string" ? MDT.tokenizeInlineMDT(props.mdt) : props.mdt
    ), [props.mdt]);

    return inlineNodeToComponent(inlineNode, props.context);
};

function inlineNodeToComponent(node: MDT.InlineNode | MDT.AnyInlineNode, context: MDTContext): React.ReactElement {
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "inline":
            return (
                <React.Fragment key={key}>
                    {node.children.map((child) => inlineNodeToComponent(child, context))}
                </React.Fragment>
            );
        case "text":
            return <React.Fragment key={key}>{node.text}</React.Fragment>;
        case "link":
            if (context.disableInteractiveFeatures) {
                // Links are currently disabled in this context, so render plain text with an underline.
                return (
                    <span key={key} className="underline">
                        {node.children.map((child) => inlineNodeToComponent(child, context))}
                    </span>
                );
            } else if (node.href.startsWith("#")) {
                return (
                    <a href={node.href} key={key}>
                        {node.children.map((child) => inlineNodeToComponent(child, context))}
                    </a>
                );
            } else if (node.href.startsWith("/")) {
                const entryLinkMatch = node.href.match(/^\/entry\/([\w-]+)$/);
                if (entryLinkMatch) {
                    // This is a link to an entry
                    const entryKey = entryLinkMatch[1];
                    return (
                        <EntryLink key={key} entryKey={entryKey} mdtContext={context}>
                            {node.children.map((child) => inlineNodeToComponent(child, context))}
                        </EntryLink>
                    );
                } else {
                    // Not sure what this is linking to...
                    return (
                        <Link href={node.href} key={key}>
                            <a>{node.children.map((child) => inlineNodeToComponent(child, context))}</a>
                        </Link>
                    );
                }
            } else if (
                node.href.startsWith("http://") || node.href.startsWith("https://") || node.href.startsWith("mailto:")
            ) {
                return (
                    <a href={node.href} key={key} target="_blank" rel="noopener">
                        {node.children.map((child) => inlineNodeToComponent(child, context))}
                        {/* Icon to indicate this is an external link */}
                        <span title="(External Link)">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                fill="currentColor"
                                className="inline-block mx-1 text-gray-400 align-baseline"
                                viewBox="0 0 16 16"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
                                />
                                <path
                                    fillRule="evenodd"
                                    d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"
                                />
                            </svg>
                        </span>
                    </a>
                );
            } else {
                // We don't know what this link is - seems invalid.
                return (
                    <React.Fragment key={key}>
                        {node.children.map((child) => inlineNodeToComponent(child, context))}
                    </React.Fragment>
                );
            }
        case "code_inline":
            return <code key={key}>{node.children[0].text}</code>;
        case "lookup_inline": {
            const lookupExpression = node.children[0].text;
            const lookupData = context.refCache.lookups.find((x) =>
                x.entryContext === context.entryId && x.lookupExpression === lookupExpression
            );
            if (lookupData) {
                return <LookupValue key={key} mdtContext={context} value={lookupData.value} />;
            }
            return <code key={key} className="text-red-500">{"{"}{lookupExpression}{"}"}</code>;
        }
        case "strong":
            return <strong key={key}>{node.children.map((child) => inlineNodeToComponent(child, context))}</strong>;
        case "em":
            return <em key={key}>{node.children.map((child) => inlineNodeToComponent(child, context))}</em>;
        case "s":
            return <s key={key}>{node.children.map((child) => inlineNodeToComponent(child, context))}</s>;
        case "hardbreak":
            return <br key={key} />;
        case "softbreak":
            return <React.Fragment key={key}>{" "}</React.Fragment>;
        case "sub":
            return <sub key={key}>{node.children.map((child) => inlineNodeToComponent(child, context))}</sub>;
        case "sup":
            return <sup key={key}>{node.children.map((child) => inlineNodeToComponent(child, context))}</sup>;
        case "footnote_ref": {
            if (context.disableInteractiveFeatures) {
                // Footnotes are disabled in this context so just render an asterisk as a placeholder.
                return <span key={key}>*</span>;
            }
            const footnoteParagraph = (context[footnotes])?.[node.footnoteId].children[0];
            return (
                <HoverClickNote key={key} displayText={node.referenceText}>
                    <p className="text-sm">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(footnoteParagraph as any).children.map((child: any) => inlineNodeToComponent(child, context))}
                    </p>
                </HoverClickNote>
            );
        }
        case "footnote_inline":
            if (context.disableInteractiveFeatures) {
                // Footnotes are disabled in this context so just render an asterisk as a placeholder.
                return <span key={key}>*</span>;
            }
            return (
                <HoverClickNote key={key}>
                    <p className="text-sm">{node.children.map((child) => inlineNodeToComponent(child, context))}</p>
                </HoverClickNote>
            );
        default:
            return <React.Fragment key={key}>[Unknown MDT Node]</React.Fragment>;
    }
}

interface BlockProps {
    mdt: string | MDT.RootNode;
    context: MDTContext;
    children?: never;
}

/**
 * Render some MDT (Markdown) in article mode, which allows all elements, like headings, paragraphs, images, etc.
 */
export const RenderMDT: React.FunctionComponent<BlockProps> = (props) => {
    // If we've been given an MDT string instead of a syntax tree, parse it, but only do so once:
    const document: MDT.RootNode = React.useMemo(() => (
        typeof props.mdt === "string" ? MDT.tokenizeMDT(props.mdt) : props.mdt
    ), [props.mdt]);

    return (
        <>
            {document.children.map((node) =>
                nodeToComponent(node, props.context.childContextWith({ [footnotes]: document.footnotes }))
            )}
            {document.footnotes
                ? // When viewing this document in print mode, display all the footnotes:
                    <div className="hidden print:block text-sm">
                        {React.createElement(
                            `h${1 + props.context.headingShift}`,
                            { id: `footnotes` },
                            <>
                                <FormattedMessage id="t1Ql7Y" defaultMessage="Footnotes" />
                            </>,
                        )}
                        <ol>
                            {document.footnotes.map((node) => nodeToComponent(node, props.context))}
                        </ol>
                    </div>
                : null}
        </>
    );
};

function nodeToComponent(node: MDT.Node, context: MDTContext): React.ReactElement {
    if (!("block" in node)) {
        // This is an inline node:
        return inlineNodeToComponent(node, context);
    }
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "heading": {
            const level = node.level + context.headingShift;
            return React.createElement(
                `h${level}`,
                { key, id: `h-${node.slugId}` },
                node.children.map((child) => nodeToComponent(child, context)),
            );
        }
        case "paragraph":
            return <p key={key}>{node.children.map((child) => nodeToComponent(child, context))}</p>;
        case "list_item":
            return <li key={key}>{node.children.map((child) => nodeToComponent(child, context))}</li>;
        case "bullet_list":
            return <ul key={key}>{node.children.map((child) => nodeToComponent(child, context))}</ul>;
        case "ordered_list": {
            const olProps: React.DetailedHTMLProps<React.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement> = {
                key,
            };
            if (node.start !== undefined) olProps.start = node.start; // This list starts at some number other than 1
            return <ol {...olProps}>{node.children.map((child) => nodeToComponent(child, context))}</ol>;
        }
        case "hr":
            return <hr key={key} />;
        case "code_block":
            return (
                <code key={key}>
                    <pre>{node.children[0].text}</pre>
                </code>
            );
        case "lookup_block": {
            const lookupExpression = node.children[0].text;
            const lookupData = context.refCache.lookups.find((x) =>
                x.entryContext === context.entryId && x.lookupExpression === lookupExpression
            );
            if (lookupData) {
                return <LookupValue key={key} mdtContext={context} value={lookupData.value} />;
            }
            return (
                <code key={key} className="text-red-500">
                    <pre>{"{"}{lookupExpression}{"}"}</pre>
                </code>
            );
        }
        case "table":
        case "thead":
        case "tbody":
        case "tr": {
            const children: MDT.Node[] = node.children;
            return React.createElement(node.type, { key }, children.map((child) => nodeToComponent(child, context)));
        }
        case "td":
        case "th": {
            const props: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement> = {
                key,
            };
            if (node.align !== undefined) props.style = { textAlign: node.align };
            return React.createElement(node.type, props, node.children.map((child) => nodeToComponent(child, context)));
        }
        case "blockquote": {
            return <blockquote key={key}>{node.children.map((child) => nodeToComponent(child, context))}</blockquote>;
        }
        case "footnote": {
            return (
                <li key={key} value={node.id + 1}>
                    {node.children.map((child) => nodeToComponent(child, context))}
                </li>
            );
        }
        default:
            return <React.Fragment key={key}>[ Unimplemented MDT node type: {(node as MDT.Node).type} ]</React.Fragment>;
    }
}

const keyMap: WeakMap<MDT.Node, number> = new WeakMap();
let nextReactKey = 1;
/**
 * Helper function to build a unique numeric ID to identify every node in the parsed MDT tree.
 * Why: we have to use a key when building a list of items in React, and it must be a primitive
 * value. We use a WeakMap to consistently associate each MDT Node with a numeric key.
 */
function getReactKeyForNode(node: MDT.Node) {
    let key = keyMap.get(node);
    if (key === undefined) {
        key = nextReactKey++;
        keyMap.set(node, key);
    }
    return key;
}
