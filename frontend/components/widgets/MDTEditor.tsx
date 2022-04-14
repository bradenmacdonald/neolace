import React from 'react';
import { useIntl } from 'react-intl';
import { Editor, Transforms, type Descendant } from 'slate'
import { Editable, RenderLeafProps, Slate } from 'slate-react';
import { emptyDocument, EscapeMode, parseMdtStringToSlateDoc, slateDocToStringValue, stringValueToSlateDoc, useNeolaceSlateEditor } from 'components/utils/slate';
import { ToolbarButton } from './Button';
import { renderElement } from 'components/utils/slate-mdt';


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
export const MDTEditor: React.FunctionComponent<Props> = ({value = '', ...props}) => {
    const intl = useIntl();
    const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);
    const editor = useNeolaceSlateEditor();
    const [sourceMode, setSourceMode] = React.useState(true);
    const toggleSourceMode = React.useCallback(() => setSourceMode(prevMode => !prevMode), []);
    const [lastSourceMode, updateLastSourceMode] = React.useState(sourceMode);

    const [lastValueInternallySet, updateLastValueInternallySet] = React.useState<string|undefined>(undefined);
    const rootDiv = React.useRef<HTMLDivElement>(null);

    // This effect is used to handle the situation where our parent element changes props.value.
    React.useEffect(() => {
        if (value !== lastValueInternallySet) {
            // props.value has changed externally (not via changes within the Slate editor).
            // So now we need to replace the contents of the editor with the new value.

            // Before we change the value within the editor, we may need to move the selection, or else if the new text
            // is shorter, slate may give an error when trying to keep the cursor in the same position which no longer
            // exists:
            Transforms.deselect(editor);  // Just de-select, otherwise we may trap focus in this element if we're handling a blur at the moment.

            // Update the editor:
            editor.children = sourceMode ? stringValueToSlateDoc(value) : parseMdtStringToSlateDoc(value, props.inlineOnly);
            updateLastValueInternallySet(value);
        }
    }, [value, lastValueInternallySet, sourceMode]);

    // This effect is used to handle toggling between "visual mode" (WYSIWYG) and "source mode" (edit the plain MDT/markdown)
    React.useEffect(() => {
        if (sourceMode !== lastSourceMode) {
            if (sourceMode) {
                // We have turned source mode on; update the source based on the current state of the visual editor.
                // FIRST update value based on the visual editor's tree.
                const newValue = slateDocToStringValue(editor.children, EscapeMode.MDT);
                // THEN:
                editor.children = stringValueToSlateDoc(newValue);
                updateLastValueInternallySet(newValue);
                if (props.onChange) {
                    props.onChange(newValue);
                }
            } else {
                // We have turned source mode off; update the visual editor's document accordingly.
                editor.children = parseMdtStringToSlateDoc(value, props.inlineOnly);
                // To avoid editing issues, we need to normalize the tree according to Slate rules:
                Editor.normalize(editor, {force: true});
            }
            updateLastSourceMode(sourceMode);
        }
    }, [sourceMode, lastSourceMode, value, props.onChange]);

    const handleChange = React.useCallback((newEditorState: Descendant[]) => {
        if (sourceMode && props.onChange) {
            const newValue = slateDocToStringValue(newEditorState, EscapeMode.PlainText);
            updateLastValueInternallySet(newValue);  // Mark this as an internal change, not coming from outside this component.
            props.onChange(newValue);
        } else {
            // The user has made changes in visual edit mode. We won't notify the 'onChange'
            // handler until they blur off of this editor or go back to source mode, because
            // the visual editor's data model is richer than the simple 'value' prop and we
            // don't want the onChange handler to change the value prop now and reset the
            // editor state in the middle of editing.
        }
    }, [props.onChange, sourceMode]);

    // Track whether or not the user is actively using this overall editor widget.
    // When in "visual mode" (not source mode), we don't notify the parent element about changes until they blur off of
    // this editor to some other part of the document.
    const [wasActive, setWasActive] = React.useState(false);
    const isActive = useSmartFocusAwareness(rootDiv.current);
    React.useEffect(() => {
        if (isActive !== wasActive) {
            if (isActive && props.onFocus) {
                props.onFocus();
            } else if (!isActive) {
                // The user has blurred this editor. Notify our parent if it is interested.
                const newValue = slateDocToStringValue(editor.children, sourceMode ? EscapeMode.PlainText : EscapeMode.MDT);
                if (!sourceMode) {
                    updateLastValueInternallySet(newValue);
                }
                if (props.onChange) {
                    props.onChange(newValue);
                }
                if (props.onBlur) {
                    props.onBlur();
                }
            }
            setWasActive(isActive);
        }
    }, [isActive, wasActive, sourceMode, props.onFocus, props.onBlur]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={emptyDocument} onChange={handleChange}>
        <div
            className="border-2 border-gray-500 rounded-md focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full"
            ref={rootDiv}
        >
            {/* The Toolbar */}
            <div className="block w-full border-b-[1px] border-gray-500 bg-gray-100 p-1">
                <ToolbarButton
                    enabled={sourceMode}
                    onClick={toggleSourceMode}
                    title={intl.formatMessage({id: "ui.component.mdtEditor.toolbar.sourceMode", defaultMessage: "Source mode"})}
                    icon="braces-asterisk"
                />
            </div>
            {/* The Slate.js Editor textarea */}
            <Editable
                id={props.id}
                className={`outline-none border-none px-2 py-1 w-full md:w-auto md:min-w-[300px] ${sourceMode ? "font-mono text-sm" : ""}`}
                /* decorate={decorate}*/
                renderLeaf={renderLeaf}
                renderElement={renderElement}
                placeholder={props.placeholder}
            />
        </div>
  </Slate>
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
    return <span {...attributes} className="">{children}</span>;
}



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
function useSmartFocusAwareness(rootElement: HTMLDivElement|null) {

    const [isActive, setIsActive] = React.useState(false);

    const handleClick = React.useCallback((event: MouseEvent) => {
        // The user has clicked somewhere. If the click was inside the element, we are active.
        // If the click was outside, we are definitely inactive.
        setIsActive(rootElement ? rootElement.contains(event.target as Node) : false);
    }, [rootElement]);

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
        setIsActive(rootElement?.contains(document.activeElement) ?? false);
    }, [rootElement]);

    React.useEffect(() => {
        document.addEventListener("focusin", handleFocus);
        return () => {
            // Unbind the event listener on clean up
            document.removeEventListener("focusin", handleFocus);
        };
    }, [handleFocus]);

    return isActive;
}
