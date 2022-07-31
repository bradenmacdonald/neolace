import React from "react";
import { api } from "lib/api-client";
import { BaseEditor, createEditor, Element, Node, Transforms, Range, Editor } from "slate";
import { ReactEditor, withReact } from "slate-react";
import { HistoryEditor, withHistory } from "slate-history";

export type NeolaceSlateEditor = BaseEditor & ReactEditor & HistoryEditor;

/**
 * This node is not part of MDT or lookup expressions but is used in our editor as a placeholder for a
 * 'entry("_VNID")' entry identifier, so that we aren't displaying the (unhelpful) VNID to the user, and we can
 * instead display a nice friendly entry widget.
 */
export interface VoidEntryNode extends api.MDT.CustomInlineNode {
    type: "custom-void-entry";
    entryId: api.VNID;
    children: [{ type: "text"; text: "" }];
}

/**
 * This node is not part of MDT or lookup expressions but is used in our editor as a placeholder for a
 * 'prop("_VNID")' property identifier, so that we aren't displaying the (unhelpful) VNID to the user, and we can
 * instead display a nice friendly property name.
 */
export interface VoidPropNode extends api.MDT.CustomInlineNode {
    type: "custom-void-property";
    propertyId: api.VNID;
    children: [{ type: "text"; text: "" }];
}

/**
 * This node is not part of MDT or lookup expressions but is used in our editor as a placeholder for a
 * 'entryType("_VNID")' entry type identifier.
 */
export interface VoidEntryTypeNode extends api.MDT.CustomInlineNode {
    type: "custom-void-entry-type";
    entryTypeId: api.VNID;
    children: [{ type: "text"; text: "" }];
}

export type NeolaceSlateElement = api.MDT.Node | VoidEntryNode | VoidPropNode | VoidEntryTypeNode;

export type PlainText = { text: string };

export type NeolaceSlateText = PlainText;

/** A generic empty Slate document using our Node types. */
export const emptyDocument: NeolaceSlateElement[] = [{
    "type": "paragraph",
    "block": true,
    "children": [{ "type": "text", "text": "" }],
}];

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

    // Teach the editor how we recognize inline vs. block elements
    editor.isInline = (element) => {
        if (element.type === "text") {
            throw new Error("text is neither inline nor not.");
        }
        if ("block" in element) {
            return false;
        }
        return true;
    };

    // Teach the editor which of our node types are "voids" (contain non-editable HTML,
    // or use a special editor-within-an-editor as in the case of lookup values)
    const { isVoid } = editor;
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
    };

    // Teach the editor how to normalize our tree to comply with Slate's rules
    // https://docs.slatejs.org/concepts/11-normalizing
    const { normalizeNode } = editor;
    editor.normalizeNode = (entry) => {
        const [node, path] = entry;

        // If the element has children, ensure that there is a text element before and after every inline
        if (Element.isElement(node) && "children" in node && node.children) {
            for (let i = 0; i < node.children.length; i++) {
                const thisChild: Node = node.children[i];
                if (thisChild.type === "text") {
                    continue;
                }
                if (editor.isInline(thisChild)) {
                    const prevChild: Node | undefined = node.children[i - 1];
                    if (prevChild === undefined || prevChild.type !== "text") {
                        // We need an empty text element to occur before this child
                        // Because inlines are not allowed to be first nor adjacent to another inline
                        Transforms.insertNodes(editor, { type: "text", text: "" }, { at: [...path, i] });
                        return; // We've made a fix; restart the whole normalization process (multi-pass normalization)
                    }
                    const nextChild: Node | undefined = node.children[i + 1];
                    if (nextChild === undefined || nextChild.type !== "text") {
                        // We need an empty text element to occur after this child
                        // Because inlines are not allowed to be first nor adjacent to another inline
                        Transforms.insertNodes(editor, { type: "text", text: "" }, { at: [...path, i + 1] });
                        return; // We've made a fix; restart the whole normalization process (multi-pass normalization)
                    }
                }
            }
        }

        // Fall back to the original `normalizeNode` to enforce other constraints.
        normalizeNode(entry);
    };

    return editor;
}

/**
 * React hook to force an update, sometimes required after manually changing 'editor.children'
 * @returns
 */
export function useForceUpdate() {
    const [_value, setValue] = React.useState(0); // integer state
    return () => setValue((value) => value + 1); // update the state to force render
}

/**
 * When using slate to edit plain text, such as the source code of Markdown or a lookup expression, use this to
 * convert the string to an editable Slate document
 */
export function stringValueToSlateDoc(value: string): NeolaceSlateElement[] {
    return value.split("\n").map((line) => {
        const parts: (api.MDT.TextNode | VoidEntryNode | VoidPropNode | VoidEntryTypeNode)[] = [];
        // Search the string and replace all `prop("_VNID")`, `entry("_VNID")`, and
        // `entryType("_VNID")` occurrences with a custom void element that looks nicer than the VNID.
        while (true) {
            // Match strings like `entry("_VNID")` but not `fooentry("_VNID")`
            //const nextProp = line.match(/(?<!\w)(entry|prop|entryType)\("(_[0-9A-Za-z]{1,22})"\)/m);
            // ^ The above doesn't work in Safari :-/ https://caniuse.com/js-regexp-lookbehind
            //   So we fake it below by optionally matching preceding word characters and then making sure that match
            //   group (1) is empty.
            const nextProp = line.match(/(\w+)?(entry|prop|entryType)\("(_[0-9A-Za-z]{1,22})"\)/m);
            if (nextProp === null || nextProp.index === undefined || nextProp[1] !== undefined) {
                parts.push({ type: "text", text: line });
                break;
            } else {
                // First add any text that comes before the prop/entry/entryType void. This may be an empty string but
                // we still need that so that the user can position their cursor before the void.
                parts.push({ type: "text", text: line.substring(0, nextProp.index) });
                const type = nextProp[2], id = nextProp[3] as api.VNID;
                if (type === "entry") {
                    parts.push({ type: "custom-void-entry", entryId: id, children: [{ type: "text", text: "" }] });
                } else if (type === "prop") {
                    parts.push({
                        type: "custom-void-property",
                        propertyId: id,
                        children: [{ type: "text", text: "" }],
                    });
                } else if (type === "entryType") {
                    parts.push({
                        type: "custom-void-entry-type",
                        entryTypeId: id,
                        children: [{ type: "text", text: "" }],
                    });
                } else throw new Error("Bad literal ID type");
                line = line.substring(nextProp.index + nextProp[0].length);
            }
        }
        return {
            type: "paragraph",
            block: true,
            children: parts,
        };
    });
}

export enum EscapeMode {
    // When editing plain text like markdown source code or inline expressions, no escaping is required
    PlainText = 0,
    // When editing Markdown in the visual editor, we have to escape any markdown formatting
    MDT = 1,
}

/**
 * Convert a Slate document back to MDT/lookup expression.
 * This works for documents being edited visually as well as for when using
 * the editor to edit plain text code with only text elements and paragraphs.
 *
 * If using this to edit plain text (MDT/markdown, lookup expressions, etc.)
 * set escape to "no-escape"; otherwise set it false so that text will be escaped correctly.
 */
export function slateDocToStringValue(node: NeolaceSlateElement[], escape: EscapeMode): string {
    let result = "";
    for (const n of node) {
        if ("text" in n) {
            if (escape === EscapeMode.MDT) {
                result += api.MDT.escapeText(n.text);
            } else {
                result += n.text;
            }
        } else if (n.type === "paragraph") {
            if (result.length > 0) {
                result += "\n";
            }
            result += slateDocToStringValue(n.children, escape);
        } else if (n.type === "link") {
            result += `[` + slateDocToStringValue(n.children, escape) + `](${n.href})`;
        } else if (n.type === "strong") {
            result += `**` + slateDocToStringValue(n.children, escape) + `**`;
        } else if (n.type === "em") {
            result += `_` + slateDocToStringValue(n.children, escape) + `_`;
        } else if (n.type === "sup") {
            result += `^` + slateDocToStringValue(n.children, escape) + `^`;
        } else if (n.type === "sub") {
            result += `~` + slateDocToStringValue(n.children, escape) + `~`;
        } else if (n.type === "code_inline") {
            result += '`' + slateDocToStringValue(n.children, EscapeMode.PlainText) + '`';
        } else if (n.type === "lookup_inline") {
            result += `{ ` + slateDocToStringValue(n.children, EscapeMode.PlainText) + ` }`;
        } else if (n.type === "custom-void-entry") {
            result += `entry("${(n as VoidEntryNode).entryId}")`;
        } else if (n.type === "custom-void-property") {
            result += `prop("${(n as VoidPropNode).propertyId}")`;
        } else if (n.type === "custom-void-entry-type") {
            result += `entryType("${(n as VoidEntryTypeNode).entryTypeId}")`;
        } else {
            throw new Error(`sdtv: unexpected node in slate doc: ${n.type}`);
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
        return [{ type: "text", text: " " }];
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
        let children = cleanMdtNodeForSlate(api.MDT.tokenizeInlineMDT(mdt));
        if (children.length === 0) {
            // We always have to have at least one text child:
            children = [{ type: "text", text: "" }];
        }
        return [{
            type: "paragraph",
            block: true,
            children,
        }];
    } else {
        throw new Error("Block-level MDT editing is not yet supported.");
    }
}

type AutocompletionState = {
    /** entityReference means autocomplete an entry, property, or entry type. */
    type: "entityReference";
    /** The range of text in the Slate.js editor that triggered the autocompletion (e.g. "@a" if the user types '@' and 'a') */
    target: Range;
    /** The search string that the user has typed into the editor; use it to filter the autocompletion list. */
    search: string;
    /** The absolute position ([X, Y]) of where the dropdown should appear. Uses CSS units like ['4px', '180px'] */
    position: [string, string];
} | {
    type: undefined;
    target: undefined;
    search: "";
};

/**
 * Put this into a Slate.js onChange event handler to check for circumstances where we should show an autocompletion
 * popup, such as if the user types '@something' to mention an entry, property, or entry type (or user in future?).
 *
 * It would be nice to also use this to autocomplete available lookup functions.
 * @param editor
 * @returns
 */
export function checkForAutocompletion(editor: NeolaceSlateEditor): AutocompletionState {
    // Adapted from https://github.com/ianstormtaylor/slate/blob/main/site/examples/mentions.tsx
    const { selection } = editor;

    const getPosition = (range: Range): [string, string] => {
        try {
            const domRange = ReactEditor.toDOMRange(editor, range);
            const rect = domRange.getBoundingClientRect();
            return [`${rect.left + window.pageXOffset}px`, `${rect.top + window.pageYOffset + 24}px`];
        } catch (_err) {
            // If we can't get a DOM range, get a DOM node, which should work:
            const domElement = ReactEditor.toDOMNode(editor, Editor.node(editor, range.anchor.path)[0]);
            const rect = domElement.getBoundingClientRect();
            return [`${rect.left + window.pageXOffset}px`, `${rect.top + window.pageYOffset + 24}px`];
        }
    };

    if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
        // Get the text that comes before the current cursor position:
        const lineBefore = Editor.before(editor, start, { unit: "line" });
        const beforeRange = lineBefore && Editor.range(editor, lineBefore, start);
        const beforeText = beforeRange && Editor.string(editor, beforeRange);
        // Require that the @ symbol is at the beginning of the line OR after a whitespace character
        const beforeMatch = beforeText && beforeText.match(/(^|\s)@([\w-]+)?$/);
        // And we currently require that the @something... be at the end of the line or followed by a space:
        const after = Editor.after(editor, start);
        const afterRange = Editor.range(editor, start, after);
        const afterText = Editor.string(editor, afterRange);
        const afterMatch = afterText.match(/^(\s|$)/);

        if (beforeMatch && afterMatch) {
            // The user has typed '@something...'
            // Compute the Range for the '@something' text
            const atMentionStartPoint = Editor.before(editor, start, {unit: "character", distance: (beforeMatch[2]?.length ?? 0) + 1});
            const atMentionRange = atMentionStartPoint && Editor.range(editor, atMentionStartPoint, start);
            if (atMentionRange) {
                return {
                    type: "entityReference",
                    target: atMentionRange,
                    search: beforeMatch[2] ?? "",
                    position: getPosition(beforeRange),
                };
            }
        }
    }
    return {
        type: undefined,
        target: undefined,
        search: "",
    };
}

/**
 * React hook for a Slate.js editor to track autocompletion (drop down completion of keywords).
 */
export function useAutocompletionState(): [
    state: AutocompletionState,
    setState: (newState: AutocompletionState) => void,
] {
    const [type, setType] = React.useState<AutocompletionState["type"]>();
    const [target, setTarget] = React.useState<AutocompletionState["target"]>();
    const [search, setSearch] = React.useState<AutocompletionState["search"]>("");
    const [position, setPosition] = React.useState<[string, string]>(["0px", "0px"]);
    // TODO: move position calculation here and make it not stateful. Requires 'editor' be passed in.

    const setter = React.useCallback((newState: AutocompletionState) => {
        if (newState.type === "entityReference" && newState.target !== undefined) {
            setType(newState.type);
            setTarget(newState.target);
            setSearch(newState.search);
            setPosition(newState.position);
        } else {
            setType(undefined);
            setTarget(undefined);
            setSearch("");
            setPosition(["0px", "0px"]);
        }
    }, []);

    return [{ type, target, search, position } as AutocompletionState, setter];
}
