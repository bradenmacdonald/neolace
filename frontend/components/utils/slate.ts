import React from "react";
import { api } from "lib/api-client";
import { BaseEditor, createEditor } from "slate";
import { ReactEditor, withReact } from "slate-react";
import { HistoryEditor, withHistory } from 'slate-history'

export type NeolaceSlateEditor = BaseEditor & ReactEditor & HistoryEditor;

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
    return editor;
}

/**
 * React hook to force an update, sometimes required after manually changing 'editor.children'
 * @returns 
 */
export function useForceUpdate(){
    const [value, setValue] = React.useState(0); // integer state
    return () => setValue(value => value + 1); // update the state to force render
}

export type NeolaceSlateElement = api.MDT.Node;

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
 * When using slate to edit plain text, such as the source code of Markdown or a lookup expression, use this to
 * convert the string to an editable Slate document
 */
 export function stringValueToSlateDoc(value: string): NeolaceSlateElement[] {
    return value.split("\n").map(line => ({
        type: "paragraph",
        block: true,
        children: [ { type: "text", text: line } ],
    }));
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
        } else {
            // deno-lint-ignore no-explicit-any
            console.error(`sdtv: unexpected node in slate doc: ${(node as any).type}`);
        }
    }
    return result;
}
