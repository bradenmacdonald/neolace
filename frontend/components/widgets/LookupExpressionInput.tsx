import React from 'react';
import { createEditor, type Descendant } from 'slate'
import { Editable, ReactEditor, RenderLeafProps, Slate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import 'components/utils/slate';


interface Props {
    /** The lookup value that is currently being edited */
    value: string;
    /** Event handler, called on any change at all. */
    onChange: (newValue: string) => void;
    /** Event handler, called when the user has made changes and then pressed ENTER or blurred this input. */
    onFinishedEdits?: (newValue: string) => void;
    placeholder?: string;
    /** ID for the underlying textarea, used to focus on it with a label */
    id?: string;
}

/**
 * A lookup expression input. Normally a single-line, but if the user enters newlines (with shift-enter) it will become multi-line.
 */
export const LookupExpressionInput: React.FunctionComponent<Props> = (props) => {

    const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);
    // We need to use "useState" on the next line instead of "useMemo" due to https://github.com/ianstormtaylor/slate/issues/4081
    const [editor] = React.useState(() => withHistory(withReact(createEditor())));

    const [currentLookupValue, setCurrentLookupValue] = React.useState(props.value);
    const parsedValue: Descendant[] = React.useMemo(() => {
        return props.value.split("\n").map(line => ({
            type: "paragraph",
            children: [ { text: line } ],
        }));
    }, [props.value]);
    React.useEffect(() => {
        // This function should force the editor to update its contents IF "props.value" is changed externally, but
        // should also ignore updates that match the current value that the editor has.
        if (props.value !== currentLookupValue) {
            setCurrentLookupValue(props.value);
            editor.children = parsedValue;
        }
    }, [props.value, currentLookupValue, setCurrentLookupValue]);

    const handleChange = React.useCallback((newValue: Descendant[]) => {
        if (props.onChange) {
            const newLookupValue = slateDocToStringValue(newValue);
            props.onChange(newLookupValue);
            setCurrentLookupValue(newLookupValue);  // Mark this as an internal change, not coming from outside this component.
        }
    }, [props.onChange, slateDocToStringValue]);

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            if (!event.shiftKey) {
                event.preventDefault();
                // We now "accept" this edit and blur the input
                ReactEditor.blur(editor);
            } else {
                // For shift-enter, use the editor's default behavior of adding a new paragraph/block element.
            }
        }
    }, [editor]);

    const handleBlur = React.useCallback(() => {
        if (props.onFinishedEdits) {
            const newValue = slateDocToStringValue(editor.children);
            props.onFinishedEdits(newValue);
        }
    }, [editor, props.onFinishedEdits]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={parsedValue} onChange={handleChange}>
        <div className="border-2 border-gray-500 rounded-md inline-flex items-center focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full md:w-auto md:min-w-[600px] max-w-full">
            {/* toolbar and custom buttons etc. can go here. within the box. */}
            <Editable
                id={props.id}
                className="outline-none border-none px-2 py-1 w-full md:w-auto md:min-w-[300px] font-mono"
                onKeyDown={handleKeyDown}
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

function slateDocToStringValue(node: Descendant[]) {
    let result = "";
    for (const n of node) {
        if ("text" in n) {
            result += n.text;
        } else if (n.type === "paragraph") {
            if (result.length > 0) {
                result += "\n";
            }
            result += slateDocToStringValue(n.children);
        }
    }
    return result;
}