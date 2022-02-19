import React from "react";

/**
 * Some widget that appears in a UI slot
 */
export interface UISlotWidget<ContentType = React.ReactElement> {
    id: string;
    /** Only some slots will display the labels of widgets, and possibly only sometimes (e.g. only on mobile) */
    // label?: React.ReactElement;
    /** Priority, 0 comes first, 100 comes last */
    priority: number;
    content: ContentType;
}

interface Props<ContentType = React.ReactElement> {
    defaultContents?: readonly UISlotWidget<ContentType>[];
    slotId: string;
    // context data ?
    renderWidget: (widget: UISlotWidget<ContentType>) => React.ReactElement;
}

export const defaultRender = (widget: UISlotWidget<React.ReactElement>) => <React.Fragment key={widget.id}>{widget.content}</React.Fragment>;

/**
 * A UI slot is a placeholder in the user interface that can be filled with various content/widgets, and in particular
 * which plugins can modify.
 */
export const UISlot = <ContentType extends React.ReactElement>(props: Props<ContentType>) => {

    // TODO: allow plugins to modify the default contents. And/or allow placement to be "before", "after", "innerBefore", "innerAfter" an existing slot widget?

    const contents = [...props.defaultContents ?? []];
    // Sort first by priority, then by ID
    contents.sort((a, b) => (a.priority - b.priority) * 10_000 + a.id.localeCompare(b.id));

    return <>
        {contents.map((c) => props.renderWidget(c))}
    </>;
}
