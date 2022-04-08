import React from "react";
import { api } from "lib/api-client";
import { BaseEditor, createEditor } from "slate";
import { ReactEditor, withReact } from "slate-react";
import { HistoryEditor, withHistory } from 'slate-history'

export type NeolaceSlateEditor = BaseEditor & ReactEditor & HistoryEditor;

/**
 * This node is not part of MDT or lookup expressoins but is used in our editor as a placeholder for a
 * '[[/prop/_VNID]]' property identifier, so that we aren't displaying the (unhelpful) VNID to the user, and we can
 * instead display a nice friendly property name.
 */
export interface VoidPropNode extends api.MDT.CustomInlineNode {
    type: "custom-void-property";
    propertyId: api.VNID;
    children: [{type: "text", text: ""}];
}

export type NeolaceSlateElement = api.MDT.Node | VoidPropNode;

export type PlainText = { text: string };

export type NeolaceSlateText = PlainText;

/** A generic empty Slate document using our Node types. */
export const emptyDocument: NeolaceSlateElement[] = [{"type":"paragraph","block":true,"children":[{"type":"text","text":""}]}];

declare module "slate" {
    interface CustomTypes {
        Editor: NeolaceSlateEditor;
        Element: NeolaceSlateElement;
        Text: api.MDT.TextNode;
    }
}

/**
 * Create a new instance of a Neolace Slate Editor, which can do WYSIWYG editing of MDT (Markdown) and/or Lookup
 * expressions.
 */
export function createNeolaceSlateEditor(): NeolaceSlateEditor {
    const editor = withHistory(withReact(createEditor()));

    // Customizations to editor can be made here.

    return editor;
}

/**
 * React hook to use our Neolace Slate.js editor
 * @returns 
 */
export function useNeolaceSlateEditor(): NeolaceSlateEditor {
    // We need to use "useState" on the next line instead of "useMemo" due to https://github.com/ianstormtaylor/slate/issues/4081
    const [editor] = React.useState(() => createNeolaceSlateEditor());

    editor.isInline = (element) => {
        if (element.type !== "text" && "block" in element) {
            return false;
        }
        return true;
    };

    const {isVoid} = editor;
    editor.isVoid = (element) => {
        if (element.type.startsWith("custom-void-")) {
            return true;
        }
        switch (element.type) {
            case "lookup_inline":
                return true;
            default:
                return isVoid(element);
        }
    }

    return editor;
}

/**
 * React hook to force an update, sometimes required after manually changing 'editor.children'
 * @returns 
 */
export function useForceUpdate(){
    const [_value, setValue] = React.useState(0); // integer state
    return () => setValue(value => value + 1); // update the state to force render
}

/**
 * When using slate to edit plain text, such as the source code of Markdown or a lookup expression, use this to
 * convert the string to an editable Slate document
 */
 export function stringValueToSlateDoc(value: string): NeolaceSlateElement[] {
    return value.split("\n").map(line => {
        const parts: (api.MDT.TextNode|VoidPropNode)[] = [];
        // Search the string and replace all '[[/prop/_VNID]]' occurrences with a 'custom-void-property' element.
        while (true) {
            const nextProp = line.match(/\[\[\/prop\/(_[0-9A-Za-z]{1,22})\]\]/m);
            if (nextProp === null || !nextProp.index) {
                parts.push({ type: "text", text: line });
                break;
            } else {
                if (nextProp.index > 0) {
                    parts.push({ type: "text", text: line.substring(0, nextProp.index) });
                }
                parts.push({type: "custom-void-property", propertyId: nextProp[1] as api.VNID, children: [{type: "text", text: ""}]});
                line = line.substring(nextProp.index + nextProp[0].length);
            }
        }
        return {
            type: "paragraph",
            block: true,
            children: parts,
        }
    });
}

/**
 * When using slate to edit plain text, such as the source code of Markdown or a lookup expression, use this to
 * convert from the Slate document tree back to the plain text string.
 */
export function slateDocToStringValue(node: NeolaceSlateElement[]): string {
    let result = "";
    for (const n of node) {
        if ("text" in n) {
            result += n.text;
        } else if (n.type === "paragraph") {
            if (result.length > 0) {
                result += "\n";
            }
            result += slateDocToStringValue(n.children);
        } else if (n.type === "custom-void-property") {
            result += `[[/prop/${(n as VoidPropNode).propertyId}]]`;
        } else {
            // deno-lint-ignore no-explicit-any
            console.error(`sdtv: unexpected node in slate doc: ${(node as any).type}`);
        }
    }
    return result;
}

/**
 * Slate.js has somewhat different requirements for its tree structure than our MDT AST (parsed Markdown tree
 * structure), so this function converts from our MDT tree to a Slate.js document tree. Note that Slate.js itself
 * might modify the tree even more, e.g. to insert 'text' nodes before/after/between inline elements.
 */
function cleanMdtNodeForSlate(node: api.MDT.Node): api.MDT.Node[] {
    if (node.type === "softbreak") {
        // Softbreaks don't appear in the visual editor.
        return [{type: "text", text: " "}];
    }
    if ("children" in node && node.children) {
        const originalChildren = node.children;
        const newChildren = [];
        for (const child of originalChildren) {
            newChildren.push(...cleanMdtNodeForSlate(child));
        }
        if (node.type === "inline") {
            // Slate.js doesn't really need the "inline" node itself, so just remove it from the tree.
            return newChildren;
        }
        node.children = newChildren;
    }
    return [node];
}

export function parseMdtStringToSlateDoc(mdt: string, inline?: boolean): NeolaceSlateElement[] {
    if (inline) {
        return [{
            type: "paragraph",
            block: true,
            children: cleanMdtNodeForSlate(api.MDT.tokenizeInlineMDT(mdt)),
        }];
    } else {
        throw new Error("Block-level MDT editing is not yet supported.");
    }
}
