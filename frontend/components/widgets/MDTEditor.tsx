import React from 'react';
import { useIntl } from 'react-intl';
import { type Descendant } from 'slate'
import { Editable, RenderLeafProps, Slate } from 'slate-react';
import { emptyDocument, parseMdtStringToSlateDoc, slateDocToStringValue, stringValueToSlateDoc, useNeolaceSlateEditor } from 'components/utils/slate';
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
    const toggleSourceMode = React.useCallback(() => setSourceMode(!sourceMode), [sourceMode, setSourceMode]);
    const [lastSourceMode, updateLastSourceMode] = React.useState(sourceMode);

    const [lastValueInternallySet, updateLastValueInternallySet] = React.useState<string|undefined>(undefined);

    React.useEffect(() => {
        if (value !== lastValueInternallySet) {
            // props.value has changed externally (not via changes within the Slate editor).
            // Update the editor:
            editor.children = sourceMode ? stringValueToSlateDoc(value) : parseMdtStringToSlateDoc(value, props.inlineOnly);
            updateLastValueInternallySet(value);
        }
    }, [value, lastValueInternallySet, sourceMode, updateLastValueInternallySet]);


    React.useEffect(() => {
        if (sourceMode !== lastSourceMode) {
            if (sourceMode) {
                // We have turned source mode on; update the source based on the current state of the visual editor.
                // FIRST update value based on the visual editor's tree.
                const newValue = slateDocToStringValue(editor.children);
                // THEN:
                editor.children = stringValueToSlateDoc(newValue);
                updateLastValueInternallySet(newValue);
                if (props.onChange) {
                    props.onChange(newValue);
                }
            } else {
                // We have turned source mode off; update the visual editor's document accordingly.
                editor.children = parseMdtStringToSlateDoc(value, props.inlineOnly);
            }
            updateLastSourceMode(sourceMode);
        }
    }, [sourceMode, lastSourceMode, value, props.onChange, updateLastSourceMode, updateLastValueInternallySet]);

    const handleChange = React.useCallback((newEditorState: Descendant[]) => {
        if (sourceMode && props.onChange) {
            const newValue = slateDocToStringValue(newEditorState);
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

    const handleBlur = React.useCallback(() => {
        const newValue = slateDocToStringValue(editor.children);
        if (props.onChange) {
            props.onChange(newValue);
        }
        if (props.onFinishedEdits) {
            props.onFinishedEdits(newValue);
        }
    }, [editor, props.onFinishedEdits, updateLastValueInternallySet]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={emptyDocument} onChange={handleChange}>
        <div className="border-2 border-gray-500 rounded-md focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full">
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
                onBlur={handleBlur}
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
