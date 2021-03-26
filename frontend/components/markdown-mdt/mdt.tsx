import React from 'react';
import Link from 'next/link';
import * as MDT from "technotes-mdt";
import { urlForShortId } from 'components/utils/urls';


/**
 * Context data for rendering all the MDT (markdown) on a page.
 * 
 * This should have (read-only) data about all the links that occur in the MDT content, and is also updated while the
 * markdown is rendered to keep track of things like whether or not a given link is being seen for the first time on the
 * current page.
 */
export class MDTContext {
    constructor() {
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

    return inlineNodeToComponent(inlineNode);
};

function inlineNodeToComponent(node: MDT.InlineNode|MDT.AnyInlineNode): React.ReactElement {
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "inline":
            return <React.Fragment key={key}>{node.children.map(child => inlineNodeToComponent(child))}</React.Fragment>;
        case "text":
            return <React.Fragment key={key}>{node.content}</React.Fragment>;
        case "link":
            if (node.href.startsWith("#")) {
                return <a href={node.href} key={key}>{node.children.map(child => inlineNodeToComponent(child))}</a>;
            } else if (node.href.indexOf("/") === -1) {
                // This is the shortId of some TechDB entry, presumably
                const href = urlForShortId(node.href);
                if (href !== undefined) {
                    return <Link href={href} key={key}><a>{node.children.map(child => inlineNodeToComponent(child))}</a></Link>;
                } else {
                    // We don't know what this link is - seems invalid.
                    return <>{node.children.map(child => inlineNodeToComponent(child))}</>;
                }
            } else if (node.href.startsWith("http://") || node.href.startsWith("https://")) {
                return <a href={node.href} key={key}>{node.children.map(child => inlineNodeToComponent(child))}</a>;
            } else {
                // We don't know what this link is - seems invalid.
                return <React.Fragment key={key}>{node.children.map(child => inlineNodeToComponent(child))}</React.Fragment>;
            }
        case "code_inline":
            return <code key={key}>{node.content}</code>;
        case "strong":
            return <strong key={key}>{node.children.map(child => inlineNodeToComponent(child))}</strong>;
        case "em":
            return <em key={key}>{node.children.map(child => inlineNodeToComponent(child))}</em>;
        case "s":
            return <s key={key}>{node.children.map(child => inlineNodeToComponent(child))}</s>;
        case "hardbreak":
            return <br key={key} />;
        case "softbreak":
            return <React.Fragment key={key}>{" "}</React.Fragment>;
        case "sub":
            return <sub key={key}>{node.children.map(child => inlineNodeToComponent(child))}</sub>;
        case "sup":
            return <sup key={key}>{node.children.map(child => inlineNodeToComponent(child))}</sup>;
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
        {document.children.map(node => nodeToComponent(node))}
    </>;
};

function nodeToComponent(node: MDT.Node) {
    if (!("block" in node)) {
        // This is an inline node:
        return inlineNodeToComponent(node);
    }
    const key = getReactKeyForNode(node);
    switch (node.type) {
        case "heading":
            return React.createElement(`h${node.level}`, {key}, node.children.map(child => nodeToComponent(child)));
        case "paragraph":
            return <p key={key}>{node.children.map(child => nodeToComponent(child))}</p>;
        case "list_item":
            return <li key={key}>{node.children.map(child => nodeToComponent(child))}</li>;
        case "bullet_list":
            return <ul key={key}>{node.children.map(child => nodeToComponent(child))}</ul>;
        case "ordered_list":
            const olProps: any = {key,};
            if (node.start !== undefined) { olProps.start = node.start; }  // This list starts at some number other than 1
            return <ol {...olProps}>{node.children.map(child => nodeToComponent(child))}</ol>;
        case "hr":
            return <hr key={key} />;
        case "code_block":
            return <code key={key}><pre>{node.content}</pre></code>;
        case "table":
        case "thead":
        case "tbody":
        case "tr":
            const children: MDT.Node[] = node.children;
            return React.createElement(node.type, {key}, children.map(child => nodeToComponent(child)));
        case "td":
        case "th":
            const props: any = {key,}
            if (node.align !== undefined) { props.style = {textAlign: node.align}; }
            return React.createElement(node.type, props, node.children.map(child => nodeToComponent(child)));
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
