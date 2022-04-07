import React from 'react';
import { type Descendant } from 'slate'
import { Editable, ReactEditor, RenderLeafProps, Slate } from 'slate-react';
import { emptyDocument, slateDocToStringValue, stringValueToSlateDoc, useNeolaceSlateEditor } from 'components/utils/slate';


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

    const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);
    const editor = useNeolaceSlateEditor();
    const [sourceMode, setSourceMode] = React.useState(true);
    const [lastSourceMode, updateLastSourceMode] = React.useState(sourceMode);

    const [lastValueExternallySet, updateLastValueExternallySet] = React.useState<string|undefined>(undefined);

    React.useEffect(() => {
        if (value !== lastValueExternallySet || sourceMode !== lastSourceMode) {
            // props.value has changed externally (not via changes within the Slate editor).
            // Update the editor:
            editor.children = sourceMode ? stringValueToSlateDoc(value) : stringValueToSlateDoc("error: visual mode not supported yet.");
            updateLastValueExternallySet(value);
            updateLastSourceMode(sourceMode);
        }
    }, [value, sourceMode, lastValueExternallySet, lastSourceMode, updateLastValueExternallySet, updateLastSourceMode]);

    const handleChange = React.useCallback((newEditorState: Descendant[]) => {
        if (sourceMode && props.onChange) {
            const newValue = slateDocToStringValue(newEditorState);
            updateLastValueExternallySet(newValue);  // Mark this as an internal change, not coming from outside this component.
            props.onChange(newValue);
        }
    }, [props.onChange, sourceMode]);

    const handleBlur = React.useCallback(() => {
        if (props.onFinishedEdits) {
            const newValue = slateDocToStringValue(editor.children);
            props.onFinishedEdits(newValue);
        }
    }, [editor, props.onFinishedEdits]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={emptyDocument} onChange={handleChange}>
        <div className="border-2 border-gray-500 rounded-md focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full">
            <div className="block w-full border-b-2 border-gray-500 bg-gray-100">This is the toolbar. Edit mode is {sourceMode ? 'source': "visual"}.</div>
            <Editable
                id={props.id}
                className="outline-none border-none px-2 py-1 w-full md:w-auto md:min-w-[300px] font-mono text-sm"
                onBlur={handleBlur}
                /* decorate={decorate}*/
                renderLeaf={renderLeaf}
                placeholder={props.placeholder}
            />
        </div>
  </Slate>
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
    return <span {...attributes} className="">{children}</span>;
}

