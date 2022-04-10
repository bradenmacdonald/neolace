import { Icon } from "components/widgets/Icon";
import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { api, useSiteSchema } from "lib/api-client";
import { RenderElementProps } from "slate-react";
import { type VoidPropNode } from "./slate";
import './slate.tsx';

/**
 * In any of our editors (lookup expression editor, markdown source editor, markdown visual editor), this is a
 * non-editable element that represents a property, and displays it in a human-readable way. This allows us to store the
 * property VNID in the actual markdown/lookup code, but display it to the user as a nice friendly property name.
 */
export const PropertyVoid = ({ propertyId, attributes, children }: {propertyId: api.VNID, attributes: Record<string, unknown>, children: React.ReactNode}) => {
    const [schema] = useSiteSchema();
    const propertyName = schema ? (propertyId ? schema.properties[propertyId]?.name : `Unknown property (${propertyId})`) : "Loading...";
    return <span contentEditable={false} {...attributes} className="rounded-md bg-gray-100 text-sm py-1 px-2 font-medium">
        <span className="text-green-700 text-xs"><Icon icon="diamond-fill"/></span>{' '}{propertyName}
        {children /* Slate.js requires this empty text node child inside void elements that aren't editable. */}
    </span>;
}

export function renderElement({element, children, attributes}: RenderElementProps): JSX.Element {
    switch (element.type) {
        case "link":
            return <a href="#" {...attributes}>{children}</a>;
        // case "code_inline":
        //     return <code key={key}>{node.children[0].text}</code>;
        case "lookup_inline": {
            return <div className="inline-block" contentEditable={false}>
                <LookupExpressionInput value={element.children[0].text} onChange={() => {}} className="inline-block w-auto !min-w-[100px] md:!min-w-[100px] border-none outline-blue-700 text-blue-800 before:content-['{'] after:content-['}'] before:opacity-50 after:opacity-50" />
            </div>
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

        // Block elements:

        case "paragraph":
            return <p {...attributes}>{children}</p>;
        case "custom-void-property":
            return <PropertyVoid propertyId={(element as VoidPropNode).propertyId} attributes={attributes}>{children}</PropertyVoid>;
        default:
            return <span className="border-red-100 border-[1px] text-red-700">{`Unknown MDT node "${element.type}"`}</span>;
    }
}
