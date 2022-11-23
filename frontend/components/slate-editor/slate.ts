import React from "react";
import { api } from "lib/api";
import { BaseEditor, createEditor, Element, Node, Transforms, Range, Editor, BaseSelection } from "slate";
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
    propertyKey: string;
    children: [{ type: "text"; text: "" }];
}

/**
 * This node is not part of MDT or lookup expressions but is used in our editor as a placeholder for a
 * 'entryType("_VNID")' entry type identifier.
 */
export interface VoidEntryTypeNode extends api.MDT.CustomInlineNode {
    type: "custom-void-entry-type";
    entryTypeKey: string;
    children: [{ type: "text"; text: "" }];
}

/**
 * In Slate.js, unlike the MDT node tree, we use 'marks' (attributes) to indicate bold/italcs etc. not full nodes
 * StrongNode, EmphasisNode etc.
 *
 * See Slate.js docs for details on "Marks".
 */
export interface ExtendedTextNode extends api.MDT.TextNode {
    strong?: boolean,
    emphasis?: boolean,
    sub?: boolean,
    sup?: boolean,
    strikethrough?: boolean,
    /**
     * A mark used to indicate the selected text even when the editor is not focused.
     * https://github.com/ianstormtaylor/slate/issues/3412#issuecomment-1147955840
     */
    wasSelected?: boolean,
}

export type NeolaceSlateElement = api.MDT.Node | VoidEntryNode | VoidPropNode | VoidEntryTypeNode | ExtendedTextNode;

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
        Text: ExtendedTextNode;
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
                        propertyKey: id,
                        children: [{ type: "text", text: "" }],
                    });
                } else if (type === "entryType") {
                    parts.push({
                        type: "custom-void-entry-type",
                        entryTypeKey: id,
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

/** Marks are boolean flags that indicate bold/italics/strikethrough/etc. */
type Marks = Omit<ExtendedTextNode, "text"|"type">;
const allMarks: readonly (keyof Marks)[] = ["emphasis", "strong", "strikethrough", "sup", "sub"] as const;

/**
 * Convert a Slate document back to MDT/lookup expression.
 * This works for documents being edited visually as well as for when using
 * the editor to edit plain text code with only text elements and paragraphs.
 *
 * If using this to edit plain text (lookup expressions, or markdown code etc.) set escape to PlainText; otherwise for
 * visual editing of rich text, set it to MDT so that text in the generated markdown will be escaped correctly.
 */
export function slateDocToStringValue(node: NeolaceSlateElement[], escape: EscapeMode, inheritedMarks: Marks = {}): string {
    /** The output string (MDT/markdown/lookup) */
    let result = "";
    /**
     * activeMarks: a mutable object that indicates what bold/italic/superscript/subscript/strikethrough formatting is
     * active on the text in 'result', as well as the index (in characters) at which that mark started:
     **/
    const activeMarks: Partial<Record<keyof Marks, number>> = {};
    /** When a new mark (e.g. "bold") starts, we use this function to record the start point in 'activeMarks' */
    const startMark = (mark: keyof Marks) => activeMarks[mark] = result.length;
    /** End a mark and insert the required Markdown symbol (e.g. "**" for bold) at the start and end of the mark */
    const endMark = (mark: keyof Marks) => {
        const symbol = (
            mark === "strong" ? "**" :
            mark === "emphasis" ? "*" :  // Could also use '_' but it doesn't work in the middle of a word.
            mark === "strikethrough" ? "~~" :
            mark === "sub" ? "~" :
            mark === "sup" ? "^" :
            "!!!"
        );
        let insertPos = activeMarks[mark];
        if (insertPos === undefined) throw new Error("Can't end a mark that's not started.");

        // Special case: in Markdown, a starting mark cannot be followed by whitespace ("** bold**" is invalid):
        while (result[insertPos] === " " || result[insertPos] === "\n") insertPos++;
        if (insertPos >= result.length) {
            // This mark only affects whitespace, which we cannot do. So just ignore it.
            delete activeMarks[mark];
            return;
        }

        let markedText = result.substring(insertPos);
        // Insert the symbol at the start position:
        result = result.substring(0, insertPos) + symbol;

        // After the symbol comes the marked text itself, then the closing symbol:
        let tail = symbol;
        // Special case: in Markdown, an ending mark cannot be followed by whitespace ("**bold **" is invalid):
        while (markedText[markedText.length - 1] === " " || markedText[markedText.length - 1] === "\n") {
            tail += markedText[markedText.length - 1];
            markedText = markedText.substring(0, markedText.length - 1);
        }

        // Special case: In superscript/subscript sections, spaces must be escaped:
        if (mark === "sup" || mark === "sub") {
            markedText = markedText.replaceAll(/\s/g, (m) => `\\${m}`);
        }

        result += markedText + tail;
        delete activeMarks[mark];
        // Now that we've inserted a new symbol into the markdown, we need to adjust the
        // offsets of other active marks
        for (const otherMark of getActiveMarks()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (activeMarks[otherMark]! > insertPos) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                activeMarks[otherMark]! += symbol.length;
            }
        }
    }
    /** Get the keys of activeMarks, sorted by which marks are the most recent. */
    const getActiveMarks = (): (keyof Marks)[] => Object.entries(activeMarks).sort((a, b) => b[1] - a[1]).map(([mark, _index]) => mark as keyof Marks);

    // Go through the nodes recursively and convert them to Markdown (or to plain text)
    for (const n of node) {
        if ("text" in n) {
            if (escape === EscapeMode.MDT) {
                const textNode = n as ExtendedTextNode;
                // Do we need to stop any marks?
                for (const mark of getActiveMarks()) {
                    if (!textNode[mark]) endMark(mark);
                }
                // Are we starting any marks?
                for (const mark of allMarks) {
                    if (textNode[mark] && !(mark in activeMarks) && !inheritedMarks[mark]) {
                        startMark(mark);
                    }
                }
                // Now add the escaped text:
                result += api.MDT.escapeText(n.text);
            } else {
                // In "Plain Text" escape mode, we ignore all marks and don't do any escaping.
                result += n.text;
            }
        } else if (n.type === "paragraph") {
            if (result.length > 0) {
                result += "\n\n";
            }
            result += slateDocToStringValue(n.children, escape);
        } else if (n.type === "link") {
            // If any marks are only partially applied to this link, we need to end
            // those marks now and start them again inside the link
            // e.g. '**bold** [**first** word](/foo)' - valid
            //      '**bold [first** word](/foo)' - invalid, we need to avoid this.
            for (const mark of getActiveMarks()) {
                for (const textNode of n.children as ExtendedTextNode[]) {
                    if (textNode.type === "text" && !textNode[mark]) {
                        endMark(mark);
                        break;
                    }
                }
            }
            const inheritedMarks: Marks = {};
            for (const mark of getActiveMarks()) {
                inheritedMarks[mark] = true;
            }
            result += `[` + slateDocToStringValue(n.children, escape, inheritedMarks) + `](${n.href})`;
        } else if (n.type === "code_inline") {
            result += '`' + slateDocToStringValue(n.children, EscapeMode.PlainText) + '`';
        } else if (n.type === "lookup_inline") {
            result += `{ ` + slateDocToStringValue(n.children, EscapeMode.PlainText) + ` }`;
        } else if (n.type === "footnote_inline") {
            result += `^[ ` + slateDocToStringValue(n.children, EscapeMode.MDT) + ` ]`;
        } else if (n.type === "custom-void-entry") {
            result += `entry("${(n as VoidEntryNode).entryId}")`;
        } else if (n.type === "custom-void-property") {
            result += `prop("${(n as VoidPropNode).propertyKey}")`;
        } else if (n.type === "custom-void-entry-type") {
            result += `entryType("${(n as VoidEntryTypeNode).entryTypeKey}")`;
        } else {
            throw new Error(`sdtv: unexpected node in slate doc: ${n.type}`);
        }
    }
    // Do we need to stop any marks?
    for (const mark of getActiveMarks()) {
        endMark(mark);
    }
    return result;
}

/**
 * Slate.js has somewhat different requirements for its tree structure than our MDT AST (parsed Markdown tree
 * structure), so this function converts from our MDT tree to a Slate.js document tree. Note that Slate.js itself
 * might modify the tree even more, e.g. to insert 'text' nodes before/after/between inline elements.
 */
function cleanMdtNodeForSlate(node: api.MDT.Node|api.MDT.RootNode, marks: Omit<ExtendedTextNode, "text"|"type"> = {}): api.MDT.Node[] {
    let removeNode = false;
    marks = {...marks};
    if (node.type === "inline") {
        // Slate.js doesn't really need the "inline" node itself, so just remove it from the tree.
        removeNode = true;
    } else if (node.type === "text") {
        return [{...node, ...marks }];
    } else if (node.type === "softbreak") {
        // Softbreaks don't appear in the visual editor.
        return [{ type: "text", text: " ", ...marks }];
    } else if (node.type === "strong") {
        // Instead of a StrongNode, use a 'mark' to indicate this text is bold:
        removeNode = true;  // Remove this node from the tree, but keep its children
        marks.strong = true;
    } else if (node.type === "em") {
        removeNode = true;
        marks.emphasis = true;
    } else if (node.type === "sup") {
        removeNode = true;
        marks.sup = true;
    } else if (node.type === "sub") {
        removeNode = true;
        marks.sub = true;
    } else if (node.type === "s") {
        removeNode = true;
        marks.strikethrough = true;
    }
    if ("children" in node && node.children) {
        const originalChildren = node.children;
        const newChildren = [];
        for (const child of originalChildren) {
            newChildren.push(...cleanMdtNodeForSlate(child, marks));
        }
        if (removeNode) {
            // Remove this node from the tree, but keep its children in place.
            return newChildren;
        }
        node.children = newChildren;
    }
    if (node.type === "mdt-document") {
        return node.children;
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
        return cleanMdtNodeForSlate(api.MDT.tokenizeMDT(mdt));
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
        // Match the '@' symbol followed by some text:
        const beforeMatch = beforeText && beforeText.match(/@([\w-]+)?$/);
        // And we currently require that the @something... be at the end of the line or followed by a space:
        const after = Editor.after(editor, start);
        const afterRange = Editor.range(editor, start, after);
        const afterText = Editor.string(editor, afterRange);
        const afterMatch = afterText.match(/^(\s|$)/);

        if (beforeMatch && afterMatch) {
            // The user has typed '@something...'
            // Compute the Range for the '@something' text
            const atMentionStartPoint = Editor.before(editor, start, {unit: "character", distance: (beforeMatch[1]?.length ?? 0) + 1});
            const atMentionRange = atMentionStartPoint && Editor.range(editor, atMentionStartPoint, start);
            if (atMentionRange) {
                return {
                    type: "entityReference",
                    target: atMentionRange,
                    search: beforeMatch[1] ?? "",
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
