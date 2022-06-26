import React from 'react';
import { useIntl } from 'react-intl';
import { type Descendant } from 'slate'
import { Editable, ReactEditor, RenderElementProps, RenderLeafProps, Slate } from 'slate-react';
import { EscapeMode, slateDocToStringValue, stringValueToSlateDoc, useForceUpdate, useNeolaceSlateEditor, VoidEntryNode, VoidEntryTypeNode, VoidPropNode } from 'components/utils/slate';
import { EntryTypeVoid, EntryVoid, PropertyVoid } from 'components/utils/slate-mdt';
import { displayString, TranslatableString } from 'components/utils/i18n';


interface Props {
    /** The lookup value that is currently being edited */
    value: string;
    /** Event handler, called on any change at all. */
    onChange: (newValue: string) => void;
    /** Event handler, called when the user has made changes and then pressed ENTER or blurred this input. */
    onFinishedEdits?: (newValue: string) => void;
    placeholder?: TranslatableString;
    /** ID for the underlying textarea, used to focus on it with a label */
    id?: string;
    /** Override the display of this element */
    className?: string;
}

/**
 * A lookup expression input. Normally a single-line, but if the user enters newlines (with shift-enter) it will become multi-line.
 */
export const LookupExpressionInput: React.FunctionComponent<Props> = ({value, onChange, onFinishedEdits, ...props}) => {

    const intl = useIntl();
    const renderLeaf = React.useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
    const editor = useNeolaceSlateEditor();

    const forceUpdate = useForceUpdate();

    const parsedValue: Descendant[] = React.useMemo(() => stringValueToSlateDoc(value), [value]);

    React.useEffect(() => {
        // This function should force the editor to update its contents IF "props.value" is changed externally, but
        // should also ignore updates that match the current value that the editor has.
        if (value !== slateDocToStringValue(editor.children, EscapeMode.PlainText)) {
            editor.children = parsedValue;
            forceUpdate();  // Without this, sometimes React won't update and the UI won't reflect the new state.
        }
    }, [value]);

    const handleChange = React.useCallback((newValue: Descendant[]) => {
        if (onChange) {
            const newLookupValue = slateDocToStringValue(newValue, EscapeMode.PlainText);
            onChange(newLookupValue);
        }
    }, [onChange]);

    const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        if (event.key === "Enter") {
            if (!event.shiftKey) {
                event.preventDefault();
                // We now "accept" this edit and blur the input
                ReactEditor.blur(editor);
            } else {
                // For shift-enter, use the editor's default behavior of adding a soft break.
            }
        }
    }, [editor]);

    const handleBlur = React.useCallback(() => {
        if (onFinishedEdits) {
            const newValue = slateDocToStringValue(editor.children, EscapeMode.PlainText);
            onFinishedEdits(newValue);
        }
    }, [editor, onFinishedEdits]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={parsedValue} onChange={handleChange}>
        <div className={`border border-gray-500 rounded-md inline-flex items-center focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full md:w-auto md:min-w-[600px] max-w-full ${props.className ?? ""}`}>
            {/* toolbar and custom buttons etc. can go here. within the box. */}
            <Editable
                id={props.id}
                className="outline-none border-none px-2 py-1 w-full font-mono"
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                /* decorate={decorate}*/
                renderLeaf={renderLeaf}
                renderElement={renderElement}
                placeholder={props.placeholder ? displayString(intl, props.placeholder) : undefined}
            />
        </div>
  </Slate>
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
    return <span {...attributes} className="">{children}</span>;
}

export function renderElement({element, children, attributes}: RenderElementProps): JSX.Element {
    if (element.type === "custom-void-entry") {
        return <EntryVoid entryId={(element as VoidEntryNode).entryId} attributes={attributes}>{children}</EntryVoid>
    } else if (element.type === "custom-void-property") {
        return <PropertyVoid propertyId={(element as VoidPropNode).propertyId} attributes={attributes}>{children}</PropertyVoid>
    } else if (element.type === "custom-void-entry-type") {
        return <EntryTypeVoid entryTypeId={(element as VoidEntryTypeNode).entryTypeId} attributes={attributes}>{children}</EntryTypeVoid>
    } else {
        return <span {...attributes}>{children}</span>
    }
}
