import React from "react";
import { Icon } from "components/widgets/Icon";
import { LookupExpressionInput } from "components/form-input/LookupExpressionInput";
import { SDK, useEntrySummary, useSchema } from "lib/sdk";
import { type MDT } from "neolace-sdk";
import { Transforms } from "slate";
import { ReactEditor, RenderElementProps, useFocused, useSelected, useSlate } from "slate-react";
import type { VoidEntryNode, VoidEntryTypeNode, VoidPropNode } from "./slate";
import "./slate.ts";

const useVoidSelectionStatus = () => {
    const _selected = useSelected();
    const _slateEditorFocused = useFocused();
    const selected = _selected && _slateEditorFocused;
    const editor = useSlate();
    // Is the selection just on this void itself or is a larger block of text selected?
    // We want the colors to match the hover state when the cursor is just inside this void, but we want it to be
    // rendered blue to match other selections when it's part of a larger selection.
    const exclusivelySelected = (
        selected &&
        editor.selection?.anchor.path.toString() === editor.selection?.focus.path.toString() &&
        editor.selection?.anchor.offset === editor.selection?.focus.offset
    );
    return [selected, exclusivelySelected];
};

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents a property, and displays it in a human-readable way. This allows us to store the
 * property VNID in the actual markdown/lookup code, but display it to the user as a nice friendly property name.
 */
export const PropertyVoid = (
    { propertyKey, attributes, children }: {
        propertyKey: string;
        attributes: Record<string, unknown>;
        children: React.ReactNode;
    },
) => {
    const [selected] = useVoidSelectionStatus();
    const [schema] = useSchema();
    const propertyName = schema ? (propertyKey ? schema.properties[propertyKey]?.name : `Unknown property (${propertyKey})`) : "Loading...";
    return <span contentEditable={false} {...attributes} className="text-sm font-medium font-sans">
        <span className={`rounded-l-md py-[3px] px-2 bg-gray-200 text-green-700 ${selected ? '!bg-sky-300 !text-gray-700' : ''}`}>
            <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="diamond-fill"/></span>
        </span>
        <span className={`rounded-r-md py-[3px] px-2 bg-gray-100 text-gray-700 ${selected ? '!bg-sky-200' : ''}`}>{propertyName}</span>
        {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
    </span>;
}

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents an entry type, and displays it in a human-readable way.
 */
export const EntryTypeVoid = (
    { entryTypeKey, attributes, children }: {
        entryTypeKey: string;
        attributes: Record<string, unknown>;
        children: React.ReactNode;
    },
) => {
    const [selected] = useVoidSelectionStatus();
    const [schema] = useSchema();
    const entryTypeName = schema ? (schema.entryTypes[entryTypeKey]?.name ?? `Unknown entry type (${entryTypeKey})`) : "Loading...";
    const entryTypeColor = SDK.getEntryTypeColor(schema?.entryTypes[entryTypeKey]);
    return <span contentEditable={false} {...attributes} className="text-sm font-medium font-sans">
        <span className={`rounded-l-md py-[3px] px-2 bg-gray-200 ${selected ? '!bg-sky-300' : ''}`} style={{color: entryTypeColor.textColor}}>
            <span className="text-xs inline-block min-w-[1.4em] text-center"><Icon icon="square-fill"/></span>
        </span>
        <span className={`rounded-r-md py-[3px] px-2 bg-gray-100 text-gray-700 ${selected ? '!bg-sky-200' : ''}`}>{entryTypeName}</span>
        {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
    </span>;
}

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents an entry. This allows us to store the
 * property VNID in the actual markdown/lookup code, but display it to the user as a nice friendly property name.
 */
export const EntryVoid = (
    { entryId, attributes, children }: {
        entryId: SDK.VNID;
        attributes: Record<string, unknown>;
        children: React.ReactNode;
    },
) => {
    const [selected, exclusivelySelected] = useVoidSelectionStatus();
    const [entryData, referenceCache, _error] = useEntrySummary(entryId);
    const entryName = entryData?.name ?? `Entry ${entryId}`;
    const entryTypeData = referenceCache?.entryTypes[entryData?.entryType.key ?? ""];
    const color = SDK.getEntryTypeColor(entryTypeData);
    const abbrev = entryTypeData?.abbreviation ?? "";
    return (
        <span
            contentEditable={false}
            {...attributes}
            className="text-sm font-medium font-sans select-none"
            style={{
                "--entry-type-color-0": color.backgroundColor,
                "--entry-type-color-1": color.darkerBackgroundColor,
                "--entry-type-color-2": color.textColor,
            } as React.CSSProperties}
        >
            <span className={`
                rounded-l-md py-[2px] min-w-[2em] text-center inline-block
                ${selected && !exclusivelySelected ? 'bg-sky-300' : 'bg-entry-type-color-1 text-entry-type-color-2'}
            `}>
                <span className="text-xs inline-block min-w-[1.4em] text-center opacity-40 selection:bg-transparent">{abbrev}</span>
            </span>
            <span className={`
                rounded-r-md py-[3px] px-2 bg-gray-50 text-black selection:bg-transparent
                ${
                    exclusivelySelected ? 'bg-entry-type-color-0 text-entry-type-color-2' :
                    (selected ? 'bg-sky-200' :
                    'hover:bg-entry-type-color-0 hover:text-entry-type-color-2')
                }
            `}>{entryName}</span>
            {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
        </span>
    );
};

/**
 * In "visual mode" for editing an MDT (Markdown) document, this is how an inline lookup expression is rendered.
 * The lookup expression can be edited.
 */
export const InlineLookupEditableElement = (
    { element, attributes, children }: {
        element: MDT.InlineLookupNode;
        attributes: RenderElementProps["attributes"];
        children: React.ReactNode;
    },
) => {
    const editor = useSlate();

    const handleChange = React.useCallback((newValue: string) => {
        // We need to replace the text child node of the inline_lookup node, to reflect the new value.
        const path = ReactEditor.findPath(editor, element); // Path to the "lookup_inline" node
        // "if you specify a Path location, it will expand to a range that covers the entire node at that path.
        //  Then, using the range-based behavior it will delete all of the content of the node, and replace it with
        //  your text. So to replace the text of an entire node with a new string you can do:"
        Transforms.insertText(editor, newValue, { at: [...path, 0], voids: true });
    }, [editor, element]);

    return (
        <div className="inline-block select-none" contentEditable={false}>
            <LookupExpressionInput
                value={element.children[0].text}
                onChange={handleChange}
                className="inline-block w-auto !min-w-[100px] md:!min-w-[100px] border-none outline-blue-700 text-blue-800 before:content-['{'] after:content-['}'] before:opacity-50 after:opacity-50"
            />
            {children}
        </div>
    );
};

/**
 * In "visual mode" for editing an MDT (Markdown) document, this is how an inline lookup expression is rendered.
 * The lookup expression can be edited.
 */
export const BLockLookupEditableElement = (
    { element, attributes, children }: {
        element: MDT.LookupBlockNode;
        attributes: RenderElementProps["attributes"];
        children: React.ReactNode;
    },
) => {
    const editor = useSlate();

    const handleChange = React.useCallback((newValue: string) => {
        // We need to replace the text child node of the inline_lookup node, to reflect the new value.
        const path = ReactEditor.findPath(editor, element); // Path to the "lookup_inline" node
        // "if you specify a Path location, it will expand to a range that covers the entire node at that path.
        //  Then, using the range-based behavior it will delete all of the content of the node, and replace it with
        //  your text. So to replace the text of an entire node with a new string you can do:"
        Transforms.insertText(editor, newValue, { at: [...path, 0], voids: true });
    }, [editor, element]);

    return (
        <div className="select-none" contentEditable={false}>
            <LookupExpressionInput
                value={element.children[0].text}
                onChange={handleChange}
                className="inline-block w-auto !min-w-[200px] md:!min-w-[200px] border-none outline-blue-700 text-blue-800 before:content-['{'] after:content-['}'] before:opacity-50 after:opacity-50"
            />
            {children}
        </div>
    );
};

export function renderElement({ element, children, attributes }: RenderElementProps): JSX.Element {
    switch (element.type) {
        case "link":
            return <a href="#" {...attributes}>{children}</a>;
        case "code_inline":
            return <code {...attributes}>{children}</code>;
        case "lookup_inline": {
            return (
                <InlineLookupEditableElement element={element} attributes={attributes}>
                    {children}
                </InlineLookupEditableElement>
            );
        }
        case "strong":
            return <strong {...attributes}>{children}</strong>;
        case "em":
            return <em {...attributes}>{children}</em>;
        case "s": // strikethrough
            return <s {...attributes}>{children}</s>;
        // case "hardbreak":
        //     return <br key={key} />;
        case "sub":
            return <sub {...attributes}>{children}</sub>;
        case "sup":
            return <sup {...attributes}>{children}</sup>;
        // case "footnote_ref": {
        //     const footnoteParagraph = (context[footnotes] as any)[node.footnoteId].children[0];
        //     return <HoverClickNote key={key} displayText={node.referenceText}>
        //         <p className="text-sm">{footnoteParagraph.children.map((child: any) => inlineNodeToComponent(child, context))}</p>
        //     </HoverClickNote>
        // }
        // case "footnote_inline":
        //     return <HoverClickNote key={key}>
        //         <p className="text-sm">{node.children.map(child => inlineNodeToComponent(child, context))}</p>
        //     </HoverClickNote>

        case "custom-void-entry":
            return (
                <EntryVoid entryId={(element as VoidEntryNode).entryId} attributes={attributes}>{children}</EntryVoid>
            );
        case "custom-void-property":
            return (
                <PropertyVoid propertyKey={(element as VoidPropNode).propertyKey} attributes={attributes}>
                    {children}
                </PropertyVoid>
            );
        case "custom-void-entry-type":
            return (
                <EntryTypeVoid entryTypeKey={(element as VoidEntryTypeNode).entryTypeKey} attributes={attributes}>
                    {children}
                </EntryTypeVoid>
            );

        // Block elements:
        case "heading":
            return React.createElement(`h${element.level}`, attributes, children);
        case "lookup_block":
            return (
                <BLockLookupEditableElement element={element} attributes={attributes}>
                    {children}
                </BLockLookupEditableElement>
            );
        case "paragraph":
            return <p {...attributes}>{children}</p>;
        case "bullet_list":
            return <ul {...attributes}>{children}</ul>;
        case "ordered_list":
            return <ul {...attributes}>{children}</ul>;
        case "list_item":
            return <li {...attributes}>{children}</li>;
        case "footnote_inline":
            return <span {...attributes} className="bg-slate-100 border p-1 text-sm"><span className="text-xs opacity-70" contentEditable={false}>Footnote:</span> {children}</span>
        default:
            return (
                <span className="border-red-100 border-[1px] text-red-700">{`Unknown MDT node "${element.type}"`}</span>
            );
    }
}
