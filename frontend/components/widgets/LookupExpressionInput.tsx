import React from 'react';
import { createEditor, type Descendant } from 'slate'
import { Editable, ReactEditor, RenderLeafProps, Slate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import 'components/utils/slate';


interface Props {
    /** Initial value. You should probably set key={} this value as well if you want the editor to be reset when the initialValue is changed. */
    initialValue: string;
    /** Optional event handler, called on any change at all. Generally not recommended; use onFinishedEdits instead. */
    onChange?: (newValue: string) => void;
    /** Event handler, called when the user has made changes and then pressed ENTER or blurred this input. */
    onFinishedEdits?: (newValue: string) => void;
    placeholder?: string;
}

/**
 * A lookup expression input. Normally a single-line, but if the user enters newlines (with shift-enter) it will become multi-line.
 */
export const LookupExpressionInput: React.FunctionComponent<Props> = (props) => {

    const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);
    // We need to use "useState" on the next line instead of "useMemo" due to https://github.com/ianstormtaylor/slate/issues/4081
    const [editor] = React.useState(() => withHistory(withReact(createEditor())));

    const parsedValue: Descendant[] = React.useMemo(() => {
        return props.initialValue.split("\n").map(line => ({
            type: "paragraph",
            children: [ { text: line } ],
        }));
    }, [props.initialValue]);

    const handleChange = React.useCallback((newValue: Descendant[]) => {
        if (props.onChange) {
            props.onChange(slateDocToStringValue(newValue));
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
        <div className="border-2 border-gray-500 rounded-md inline-flex items-center focus-within:outline outline-2 outline-theme-link-color overflow-hidden m-[3px] w-full md:w-auto">
            {/* toolbar and custom buttons etc. can go here. within the box. */}
            <Editable
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