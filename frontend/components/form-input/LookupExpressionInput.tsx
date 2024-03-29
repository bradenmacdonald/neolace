/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { useIntl } from "react-intl";
import { Transforms, type Descendant } from "slate";
import { Editable, ReactEditor, RenderElementProps, RenderLeafProps, Slate } from "slate-react";
import {
    checkForAutocompletion,
    EscapeMode,
    NeolaceSlateElement,
    slateDocToStringValue,
    stringValueToSlateDoc,
    useAutocompletionState,
    useForceUpdate,
    useNeolaceSlateEditor,
    VoidEntryNode,
    VoidEntryTypeNode,
    VoidPropNode,
} from "components/slate-editor/slate";
import { EntryTypeVoid, EntryVoid, PropertyVoid } from "components/slate-editor/slate-mdt";
import { displayString, TranslatableString } from "components/utils/i18n";
import { AutocompletionMenu } from "components/form-input/AutocompletionMenu";
import { SDK } from "lib/sdk";

interface Props {
    /** The lookup value that is currently being edited */
    value?: string;
    /** Event handler, called on any change at all. */
    onChange?: (newValue: string) => void;
    /** Event handler, called when the user has made changes and then pressed ENTER or blurred this input. */
    onFinishedEdits?: (newValue: string) => void;
    placeholder?: TranslatableString;
    /** ID for the underlying textarea, used to focus on it with a label */
    id?: string;
    /** Override the display of this element */
    className?: string;
    readOnly?: boolean;
}

/**
 * A lookup expression input. Normally a single-line, but if the user enters newlines (with shift-enter) it will become multi-line.
 */
export const LookupExpressionInput: React.FunctionComponent<Props> = (
    { value, onChange, onFinishedEdits, ...props },
) => {
    const intl = useIntl();
    const renderLeaf = React.useCallback((props: RenderLeafProps) => <Leaf {...props} />, []);
    const editor = useNeolaceSlateEditor();
    const forceUpdate = useForceUpdate();
    const [autocompletion, setAutocompletion] = useAutocompletionState();

    const parsedValue: Descendant[] = React.useMemo(() => stringValueToSlateDoc(value ?? ""), [value]);

    React.useEffect(() => {
        // This function should force the editor to update its contents IF "props.value" is changed externally, but
        // should also ignore updates that match the current value that the editor has.
        if (value !== slateDocToStringValue(editor.children, EscapeMode.PlainText)) {
            editor.children = parsedValue;
            forceUpdate(); // Without this, sometimes React won't update and the UI won't reflect the new state.
        }
    }, [value]);

    const handleChange = React.useCallback((newValue: Descendant[]) => {
        if (onChange) {
            const newLookupValue = slateDocToStringValue(newValue, EscapeMode.PlainText);
            onChange(newLookupValue);
        }
        setAutocompletion(checkForAutocompletion(editor));
    }, [editor, onChange, setAutocompletion]);

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
        if (autocompletion.type !== undefined) {
            // While the autocomplete menu is open, ignore blue events.
            return;
        }
        if (onFinishedEdits) {
            const newValue = slateDocToStringValue(editor.children, EscapeMode.PlainText);
            onFinishedEdits(newValue);
        }
    }, [autocompletion.type, editor.children, onFinishedEdits]);

    const handleAutoCompleteSelection = React.useCallback((item: SDK.EntryValue|SDK.EntryTypeValue|SDK.PropertyValue) => {
        if (autocompletion.target === undefined) {
            return;
        }
        Transforms.select(editor, autocompletion.target);
        const node: NeolaceSlateElement = (
            item.type === "Entry" ? {type: "custom-void-entry", entryId: item.id, children: [{ type: "text", text: '' }]}
            : item.type === "Property" ? {type: "custom-void-property", propertyKey: item.key, children: [{ type: "text", text: '' }]}
            : item.type === "EntryType" ? {type: "custom-void-entry-type", entryTypeKey: item.key, children: [{ type: "text", text: '' }]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            : {type: "text", text: (item as any).id}
        ); 
        Transforms.insertNodes(editor, node, {voids: true});
        Transforms.move(editor);
        ReactEditor.focus(editor);
    }, [editor, autocompletion.target]);

    {/* Note that "value" below is really "initialValue" and updates won't affect it - https://github.com/ianstormtaylor/slate/pull/4540 */}
    return <Slate editor={editor} value={parsedValue} onChange={handleChange}>
        <div className={`border border-gray-500 rounded-md inline-flex items-center focus-within:outline outline-2 outline-theme-link-color overflow-hidden my-[3px] w-full md:w-auto md:min-w-[600px] selection:bg-sky-200 max-w-full ${props.className ?? ""}`}>
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
                readOnly={props.readOnly}
            />
            {/* Autocompletion dropdown */}
            {
                autocompletion.type === "entityReference" ?
                    <AutocompletionMenu
                        searchTerm={autocompletion.search}
                        positionLeft={autocompletion.position[0]}
                        positionTop={autocompletion.position[1]}
                        onClick={handleAutoCompleteSelection}
                    />
                : null
            }
        </div>
  </Slate>
}

const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
    return <span {...attributes} className="">{children}</span>;
};

export function renderElement({ element, children, attributes }: RenderElementProps): JSX.Element {
    if (element.type === "custom-void-entry") {
        return <EntryVoid entryId={(element as VoidEntryNode).entryId} attributes={attributes}>{children}</EntryVoid>;
    } else if (element.type === "custom-void-property") {
        return (
            <PropertyVoid propertyKey={(element as VoidPropNode).propertyKey} attributes={attributes}>
                {children}
            </PropertyVoid>
        );
    } else if (element.type === "custom-void-entry-type") {
        return (
            <EntryTypeVoid entryTypeKey={(element as VoidEntryTypeNode).entryTypeKey} attributes={attributes}>
                {children}
            </EntryTypeVoid>
        );
    } else {
        return <span {...attributes}>{children}</span>;
    }
}
