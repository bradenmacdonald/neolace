import React from "react";

import { UiPluginsContext, UiSlotId } from "components/utils/ui-plugins";

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

export const defaultRender = (widget: UISlotWidget<React.ReactElement>) => (
    <React.Fragment key={widget.id}>{widget.content}</React.Fragment>
);

/**
 * A UI slot is a placeholder in the user interface that can be filled with various content/widgets, and in particular
 * which plugins can modify.
 */
export const UISlot = function <ContentType = React.ReactElement>(props: Props<ContentType>) {
    // Allow any plugins that are active for this site to modify this UI slot:
    const pluginsData = React.useContext(UiPluginsContext);

    const contents = React.useMemo(() => {
        const contents = [...props.defaultContents ?? []];
        for (const p of pluginsData.plugins) {
            for (const change of (p.uiSlotChanges?.[props.slotId as UiSlotId] ?? [])) {
                if (change.op === "insert") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    contents.push(change.widget as UISlotWidget<any>);
                } else {
                    throw new Error(`unknown plugin UI change operation: ${change.op}`);
                }
            }
        }
        // Sort first by priority, then by ID
        contents.sort((a, b) => (a.priority - b.priority) * 10_000 + a.id.localeCompare(b.id));
        return contents;
    }, [props.defaultContents, pluginsData, props.slotId]);

    return (
        <>
            {contents.map((c) => props.renderWidget(c))}
        </>
    );
};
