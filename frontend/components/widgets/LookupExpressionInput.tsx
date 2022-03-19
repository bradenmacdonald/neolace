import React from 'react';
import { createEditor, type Descendant } from 'slate'
import { Editable, RenderLeafProps, Slate, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import 'components/utils/slate';


interface Props {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}

/**
 * A lookup expression input. Normally a single-line, but if the user enters newlines it will become multi-line.
 */
export const LookupExpressionInput: React.FunctionComponent<Props> = (props) => {

    const renderLeaf = React.useCallback(props => <Leaf {...props} />, []);
    // We need to use "useState" on the next line instead of "useMemo" due to https://github.com/ianstormtaylor/slate/issues/4081
    const [editor] = React.useState(() => withHistory(withReact(createEditor())));

    const parsedValue: Descendant[] = React.useMemo(() => {
        return props.value.split("\n").map(line => ({
            type: "paragraph",
            children: [ { text: line } ],
        }));
    }, [props.value]);

    const onChange = React.useCallback((newValue: Descendant[]) => {
        props.onChange(slateDocToStringValue(newValue));
    }, [props.onChange, slateDocToStringValue]);

    return <Slate editor={editor} value={parsedValue} onChange={onChange}>
        <div className="border-2 border-gray-500 rounded-md inline-flex items-center focus-within:outline outline-2 outline-theme-link-color overflow-hidden m-[3px] w-full md:w-auto">
            {/* toolbar and custom buttons etc. can go here. within the box. */}
            <Editable /* decorate={decorate}*/ className="outline-none border-none px-2 py-1 w-full md:w-auto md:min-w-[300px] font-mono" renderLeaf={renderLeaf} placeholder={props.placeholder} />
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