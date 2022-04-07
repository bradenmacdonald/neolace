import { LookupExpressionInput } from "components/widgets/LookupExpressionInput";
import { RenderElementProps } from "slate-react";
import './slate.tsx';

export function renderElement({element, children, attributes}: RenderElementProps): JSX.Element {
    switch (element.type) {
        // Inline elements:
        case "link":
            return <a href="#" {...attributes}>{children}</a>;
        // case "code_inline":
        //     return <code key={key}>{node.children[0].text}</code>;
        case "lookup_inline": {
            return <div className="inline-block" contentEditable={false}>
                <LookupExpressionInput value={element.children[0].text} onChange={() => {}} />
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
        // case "sub":
        //     return <sub key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</sub>;
        // case "sup":
        //     return <sup key={key}>{node.children.map(child => inlineNodeToComponent(child, context))}</sup>;
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
        default:
            return <span className="border-red-100 border-[1px] text-red-700">{`Unknown MDT node "${element.type}"`}</span>;
    }
}
