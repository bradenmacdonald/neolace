import React from "react";
import { type Descendant, Editor, Transforms, Range, Text } from "slate";
import { Editable, RenderLeafProps, Slate, useFocused, useSlate } from "slate-react";
import {
    emptyDocument,
    EscapeMode,
    ExtendedTextNode,
    NeolaceSlateEditor,
    parseMdtStringToSlateDoc,
    slateDocToStringValue,
    stringValueToSlateDoc,
    useNeolaceSlateEditor,
} from "components/utils/slate";
import { ToolbarButton } from "./Button";
import { renderElement } from "components/utils/slate-mdt";
import { defineMessage, TranslatableString } from "components/utils/i18n";
import { IconId } from "./Icon";
import { ParagraphNode } from "neolace-api/types/markdown-mdt-ast";
import { useStateRef } from "components/utils/stateRefHook";

interface Props {
    /** The MDT (Markdown) string value that is currently being edited */
    value?: string;
    /** If inline is true, block-level elements are not allowed. This is used for 'description' fields for example. */
    inlineOnly?: boolean;
    /** Event handler, called on every single edit in "source mode" but generally not called during WYSIWYG mode. */
    onChange?: (newValue: string) => void;
    /** Event handler, called when the user has made changes and then blurred this input. */
    onFinishedEdits?: (newValue: string) => void;
    placeholder?: string;
    /** ID for the underlying textarea, used to focus on it with a label */
    id?: string;

    // Optional event handlers:
    onFocus?: () => void;
    onBlur?: () => void;
}

/**
 * A large (textarea-like) editor for Markdown content. Offers both a "source mode" (raw markdown) and a "visual mode".
 *
 * In "source mode", this acts like a controlled component - the 'onChange' event will be called on every single change
 * by the user and you must update the 'mdtValue' prop for the edits to work as expected.
 *
 * In "visual mode", this does not act like a controlled component and will manage its own internal state until the user
 * clicks/tabs off the editor (blurs it), or changes to "source mode".
 *
 * In either "source mode" or "visual mode", onFinishedEdits will be called as the user blurs off of the element.
 */
export const MDTEditor: React.FunctionComponent<Props> = ({ value = "", onFocus, onChange, onBlur, inlineOnly, ...props }) => {
    const renderLeaf = React.useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
    const editor = useNeolaceSlateEditor();
    const [sourceMode, setSourceMode, sourceModeRef] = useStateRef(false);
    const toggleSourceMode = React.useCallback(() => setSourceMode((prevMode) => !prevMode), [setSourceMode]);
    const [lastSourceMode, updateLastSourceMode, lastSourceModeRef] = useStateRef(sourceMode);

    const [lastValueInternallySet, updateLastValueInternallySet] = React.useState<string | undefined>(undefined);
    const rootDiv = React.useRef<HTMLDivElement>(null);

    // This effect is used to handle the situation where our parent element changes props.value.
    React.useEffect(() => {
        if (value !== lastValueInternallySet) {
            // props.value has changed externally (not via changes within the Slate editor).
            // So now we need to replace the contents of the editor with the new value.

            // Before we change the value within the editor, we may need to move the selection, or else if the new text
            // is shorter, slate may give an error when trying to keep the cursor in the same position which no longer
            // exists:
            Transforms.deselect(editor); // Just de-select, otherwise we may trap focus in this element if we're handling a blur at the moment.

            // Update the editor:
            editor.children = sourceMode
                ? stringValueToSlateDoc(value)
                : parseMdtStringToSlateDoc(value, inlineOnly);
            updateLastValueInternallySet(value);
        }
    }, [value, lastValueInternallySet, sourceMode, editor, inlineOnly]);

    // This effect is used to handle toggling between "visual mode" (WYSIWYG) and "source mode" (edit the plain MDT/markdown)
    React.useEffect(() => {
        // Within handlers, we should always read from the 'ref' values to avoid bugs with concurrent updates:
        const sourceMode = sourceModeRef.current;
        const lastSourceMode = lastSourceModeRef.current;
        if (sourceMode !== lastSourceMode) {
            // Avoid bugs when the selection range in one mode is invalid in another mode; clear the selection now.
            Transforms.deselect(editor);

            // Now change to the new mode:
            if (sourceMode) {
                // We have turned source mode on; update the source based on the current state of the visual editor.
                // FIRST update value based on the visual editor's tree.
                const newValue = slateDocToStringValue(editor.children, EscapeMode.MDT);
                // THEN:
                editor.children = stringValueToSlateDoc(newValue);
                updateLastValueInternallySet(newValue);
                // Notify the parent that the value may have changed, based on converting the visual mode to markdown:
                onChange?.(newValue);
            } else {
                // We have turned source mode off; update the visual editor's document accordingly.
                editor.children = parseMdtStringToSlateDoc(value, inlineOnly);
                // To avoid editing issues, we need to normalize the tree according to Slate rules:
                Editor.normalize(editor, { force: true });
            }
            updateLastSourceMode(sourceMode);
        }
    }, [sourceMode, lastSourceMode, editor, value, onChange, inlineOnly, sourceModeRef, lastSourceModeRef, updateLastSourceMode]);

    const handleChange = React.useCallback((newEditorState: Descendant[]) => {
        if (sourceModeRef.current && onChange) {
            const newValue = slateDocToStringValue(newEditorState, EscapeMode.PlainText);
            updateLastValueInternallySet(newValue); // Mark this as an internal change, not coming from outside this component.
            onChange(newValue);
        } else {
            // The user has made changes in visual edit mode. We won't notify the 'onChange'
            // handler until they blur off of this editor or go back to source mode, because
            // the visual editor's data model is richer than the simple 'value' prop and we
            // don't want the onChange handler to change the value prop now and reset the
            // editor state in the middle of editing.
        }
    }, [onChange, sourceModeRef]);

    // Track whether or not the user is actively using this overall editor widget.
    // When in "visual mode" (not source mode), we don't notify the parent element about changes until they blur off of
    // this editor to some other part of the document.
    const handleFocusChange = React.useCallback((isFocused: boolean) => {
        if (isFocused) {
            onFocus?.();
        } else {
            // The user has blurred this editor. Notify our parent if it is interested.
            const newValue = slateDocToStringValue(editor.children, sourceMode ? EscapeMode.PlainText : EscapeMode.MDT);
            if (!sourceMode) {
                updateLastValueInternallySet(newValue);
            }
            onChange?.(newValue);
            onBlur?.();
        }
    }, [sourceMode, editor.children, onFocus, onChange, onBlur]);
    useSmartFocusAwareness(rootDiv.current, handleFocusChange);

    // Work around a bug where the Slate selection disappears when users click on a toolbar button
    // https://github.com/ianstormtaylor/slate/issues/3412#issuecomment-1147955840
    const handleInnerEditableBlur = React.useCallback(() => {
        const currentSelection = editor.selection;
        const hasSelection = !!currentSelection && Range.isExpanded(currentSelection);
        if (hasSelection) {
            // Mark the current text as 'selected'. We will then render a 'fake' selection so that it still looks to the
            // user as if it is selected. By inserting the 'wasSelected' mark, we also pre-split the text into separate
            // nodes (if needded), and update the selection accordingly, so we can avoid bugs later when applying marks
            // like bold using the toolbar buttons while the input element is blurred.
            Transforms.setNodes(editor, {wasSelected: false}, {at: [], match: node => Text.isText(node)});
            Transforms.setNodes(editor, {wasSelected: true}, {at: currentSelection, split: true, match: node => Text.isText(node)});
            // We must also clear the DOM selection or strange bugs can occur:
            window.getSelection()?.removeAllRanges();
        } else {
            // Clear any previous 'wasSelected' so it doesn't render now that this is blurred.
            Transforms.setNodes(editor, {wasSelected: false}, {at: [], match: node => Text.isText(node)});
        }
    }, [editor]);

    // Edit commands:
    const insertLookupExpression = React.useCallback(() => {
        const selectedText = editor.selection ? Editor.string(editor, editor.selection) : "";
        const newNode: Descendant = sourceMode ? {type: "text", text: `{ ${selectedText} }`} : { type: "lookup_inline", children: [{ type: "text", text: selectedText }] };
        Transforms.insertNodes(editor, newNode);
    }, [editor, sourceMode]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return (
        <Slate editor={editor} value={emptyDocument} onChange={handleChange}>
            <div
                className="border border-gray-500 rounded-md focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full selection:bg-sky-200"
                ref={rootDiv}
            >
                {/* The Toolbar */}
                <div className="block w-full border-b-[1px] border-gray-500 bg-gray-100 p-1">
                    <MarkButton
                        mark="strong"
                        icon="type-bold"
                        tooltip={defineMessage({id: "HedEP7", defaultMessage: "Bold text"})}
                        disabled={sourceMode}
                     />
                     <MarkButton
                        mark="emphasis"
                        icon="type-italic"
                        tooltip={defineMessage({id: "qDkbVY", defaultMessage: "Italic text"})}
                        disabled={sourceMode}
                     />
                     <MarkButton
                        mark="sup"
                        removeMark="sub"
                        icon="type-superscript"
                        tooltip={defineMessage({id: "+uJ/8b", defaultMessage: "Superscript"})}
                        disabled={sourceMode}
                     />
                     <MarkButton
                        mark="sub"
                        removeMark="sup"
                        icon="type-subscript"
                        tooltip={defineMessage({id: 'rDSlqC', defaultMessage: "Subscript"})}
                        disabled={sourceMode}
                     />
                     <MarkButton
                        mark="strikethrough"
                        icon="type-strikethrough"
                        tooltip={defineMessage({id: 'awehGz', defaultMessage: "Strike through"})}
                        disabled={sourceMode}
                     />
                    <ToolbarButton
                        onClick={insertLookupExpression}
                        tooltip={defineMessage({ id: "mFU1yM", defaultMessage: "Insert lookup expression" })}
                        icon="braces-asterisk"
                    />
                    <ToolbarButton
                        toggled={sourceMode}
                        onClick={toggleSourceMode}
                        tooltip={defineMessage({ id: "mA1RDm", defaultMessage: "Edit source" })}
                        icon="code"
                    />
                </div>
                {/* The Slate.js Editor textarea */}
                <Editable
                    id={props.id}
                    className={`outline-none border-none px-2 py-1 w-full md:w-auto md:min-w-[300px] ${
                        sourceMode ? "font-mono text-sm" : ""
                    }`}
                    /* decorate={decorate}*/
                    renderLeaf={renderLeaf}
                    renderElement={renderElement}
                    placeholder={props.placeholder}
                    onBlur={handleInnerEditableBlur}
                />
            </div>
        </Slate>
    );
};

type Mark = keyof Omit<ExtendedTextNode, "text"|"type">;
/** Is the given mark (bold/italics/etc.) active for the selected text? */
const isMarkActive = (editor: NeolaceSlateEditor, mark: Mark) => {
    const {selection} = editor;
    if (selection && Range.isExpanded(selection)) {
        // Check if every text node in the selection has the mark active:
        for (const node of (Editor.fragment(editor, selection)[0] as ParagraphNode).children) {
            if (node.type === "text") {
                if (node.text !== "" && !(node as ExtendedTextNode)[mark]) {
                    return false;
                }
            } else if (node.type === "link") {
                for (const child of node.children) {
                    if (child.type === "text" && child.text !== "" && !(child as ExtendedTextNode)[mark]) {
                        return false;
                    }
                }
            }
        }
        return true;
    } else {
        // Editor.marks() gives the currently enabled marks for when new text is typed.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (Editor.marks(editor) as any)?.[mark] === true;
    }
};
/** Toolbar button to toggle a formatting mark (bold/italics/superscript/subscript/etc.) */
const MarkButton = ({mark, removeMark, ...props}: {
    tooltip: TranslatableString,
    mark: Mark,
    removeMark?: Mark,
    icon: IconId,
    disabled?: boolean;
}) => {
    const editor = useSlate();
    const clickCallback = React.useCallback(() => {
        if (isMarkActive(editor, mark)) {
            Editor.removeMark(editor, mark)
        } else {
            Editor.addMark(editor, mark, true);
            // Remove any mark that is incompatible (e.g. subscript if we just made it superscript)
            if (removeMark) {
                Editor.removeMark(editor, removeMark);
            }
        }
    }, [editor, mark, removeMark]);

    return <ToolbarButton
        icon={props.icon}
        toggled={props.disabled ? false : isMarkActive(editor, mark)}
        onClick={clickCallback}
        tooltip={props.tooltip}
        disabled={props.disabled}
    />;
};

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
    let classes = "";
    const textNode = leaf as ExtendedTextNode;
    const isFocused = useFocused();
    if (textNode.strong) {
        classes += "font-bold ";
    }
    if (textNode.emphasis) {
        classes += "italic ";
    }
    if (textNode.strikethrough) {
        classes += "line-through ";
    }
    if (textNode.wasSelected && !isFocused) {
        classes += "bg-sky-100 ";
    }
    if (textNode.sup) {
        return <sup {...attributes} className={classes}>{children}</sup>;
    } else if (textNode.sub) {
        return <sub {...attributes} className={classes}>{children}</sub>;
    } else {
        return <span {...attributes} className={classes}>{children}</span>;
    }
};

/**
 * Given the complex UI of MDTEditor, the concept of whether or not the user is actively "focused" on the editor is a
 * little vague, so this attempts to clarify it.
 *
 * Trying naively to use focus/blur to test whether the focused element is within the editor's overall DIV does not work
 * for example, because if you are currently editing text in the editor and then click a button on the toolbar, we want
 * to think of that as one continuous editing workflow (you're not blurring focus entirely out of the editor), but the
 * browser will actually send events to say (1) you've blurred the editor, (2) the active focus is the body (none), then
 * (3) the active focus is the toolbar button. When (2) happens we don't want to send an "onBlur" event to our parent
 * because the user's focus never intentionally left the overall editor.
 */
function useSmartFocusAwareness(rootElement: HTMLDivElement | null, onFocusChange?: (isFocused: boolean) => void) {
    const [isFocused, setIsFocusedInternal] = React.useState(false);

    // This seems to be the most reliable way to be able to send onFocusChange events without causing unecessary state
    // changes and weird bugs in Firefox when used with Slate.js
    const setIsFocused = React.useCallback((newValue: boolean) => {
        let changed = false;
        setIsFocusedInternal((oldValue) => {
            if (oldValue !== newValue) {
                changed = true;
            }
            return newValue;
        });
        if (changed && onFocusChange) {
            onFocusChange(newValue);
        }
    }, [onFocusChange]);

    const handleClick = React.useCallback((event: MouseEvent) => {
        // The user has clicked somewhere. If the click was inside the element, we are active.
        // If the click was outside, we are definitely inactive.
        setIsFocused(rootElement ? rootElement.contains(event.target as Node) : false);
    }, [rootElement, setIsFocused]);

    React.useEffect(() => {
        document.addEventListener("mousedown", handleClick);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("mousedown", handleClick);
        };
    }, [handleClick]);

    const handleFocus = React.useCallback((event: FocusEvent) => {
        // The user has focused on something. If it's document.body or NULL, we may still be "active" but if it's an
        // actual element and it's outside this element, we are no longer active.
        if (document.activeElement === null || document.activeElement === document.body) {
            return; // Inconclusive
        }
        setIsFocused(rootElement?.contains(document.activeElement) ?? false);
    }, [rootElement, setIsFocused]);

    React.useEffect(() => {
        document.addEventListener("focusin", handleFocus);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("focusin", handleFocus);
        };
    }, [handleFocus]);

    return isFocused;
}
