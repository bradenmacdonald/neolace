import React, { OlHTMLAttributes } from 'react';
import Link from 'next/link';
import { api } from 'lib/api-client';
import { EntryLink } from 'components/EntryLink';
import { MDT } from 'neolace-api';


/**
 * Context data for rendering all the MDT (markdown) on a page.
 * 
 * This should have (read-only) data about all the links that occur in the MDT content, and is also updated while the
 * markdown is rendered to keep track of things like whether or not a given link is being seen for the first time on the
 * current page.
 */
export class MDTContext {
    readonly refCache: api.ReferenceCacheData;
    constructor(args: {refCache?: api.ReferenceCacheData}) {
        // If no reference cache is available, create an empty one for consistency.
        this.refCache = args.refCache ?? {entries: {}, entryTypes: {}};
    }
}


interface InlineProps {
    mdt: string|MDT.InlineNode;
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

function inlineNodeToComponent(node: MDT.InlineNode|MDT.AnyInlineNode, context: MDTContext): React.ReactElement {
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "inline":
            return <React.Fragment key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</React.Fragment>;
        case "text":
            return <React.Fragment key={key}>{node.content}</React.Fragment>;
        case "link":
            if (node.href.startsWith("#")) {
                return <a href={node.href} key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</a>;
            } else if (node.href.startsWith("/")) {
                const entryLinkMatch = node.href.match(/^\/entry\/([\w-]+)$/)
                if (entryLinkMatch) {
                    // This is a link to an entry
                    const entryKey = entryLinkMatch[1];
                    return <EntryLink key={key} entryKey={entryKey} mdtContext={context}>
                        {node.children.map(child => inlineNodeToComponent(child, context))}
                    </EntryLink>;
                } else {
                    // Not sure what this is linking to...
                    return <Link href={node.href} key={key}><a>{node.children.map(child => inlineNodeToComponent(child, context))}</a></Link>;
                }
            } else if (node.href.startsWith("http://") || node.href.startsWith("https://")) {
                return <a href={node.href} key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</a>;
            } else {
                // We don't know what this link is - seems invalid.
                return <React.Fragment key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</React.Fragment>;
            }
        case "code_inline":
            return <code key={key}>{node.content}</code>;
        case "strong":
            return <strong key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</strong>;
        case "em":
            return <em key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</em>;
        case "s":
            return <s key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</s>;
        case "hardbreak":
            return <br key={key} />;
        case "softbreak":
            return <React.Fragment key={key}>{" "}</React.Fragment>;
        case "sub":
            return <sub key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</sub>;
        case "sup":
            return <sup key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</sup>;
        default:
            return <> [Unknown MDT Node] </>;
    }
}



interface BlockProps {
    mdt: string|MDT.RootNode;
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

    return <>
        {document.children.map(node => nodeToComponent(node, props.context))}
    </>;
};

function nodeToComponent(node: MDT.Node, context: MDTContext) {
    if (!("block" in node)) {
        // This is an inline node:
        return inlineNodeToComponent(node, context);
    }
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "heading":
            return React.createElement(`h${node.level}`, {key, id: `h-${node.slugId}`}, node.children.map(child => nodeToComponent(child, context)));
        case "paragraph":
            return <p key={key}>{node.children.map(child => nodeToComponent(child, context))}</p>;
        case "list_item":
            return <li key={key}>{node.children.map(child => nodeToComponent(child, context))}</li>;
        case "bullet_list":
            return <ul key={key}>{node.children.map(child => nodeToComponent(child, context))}</ul>;
        case "ordered_list": {
            const olProps: React.DetailedHTMLProps<React.OlHTMLAttributes<HTMLOListElement>, HTMLOListElement> = {
                key,
            };
            if (node.start !== undefined) { olProps.start = node.start; }  // This list starts at some number other than 1
            return <ol {...olProps}>{node.children.map(child => nodeToComponent(child, context))}</ol>;
        }
        case "hr":
            return <hr key={key} />;
        case "code_block":
            return <code key={key}><pre>{node.content}</pre></code>;
        case "table":
        case "thead":
        case "tbody":
        case "tr": {
            const children: MDT.Node[] = node.children;
            return React.createElement(node.type, {key}, children.map(child => nodeToComponent(child, context)));
        }
        case "td":
        case "th": {
            const props: React.DetailedHTMLProps<React.TdHTMLAttributes<HTMLTableCellElement>, HTMLTableCellElement> = {
                key,
            };
            if (node.align !== undefined) { props.style = {textAlign: node.align}; }
            return React.createElement(node.type, props, node.children.map(child => nodeToComponent(child, context)));
        }
        default:
            return `[ Unimplemented MDT node type ${node.type} ]`;
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
