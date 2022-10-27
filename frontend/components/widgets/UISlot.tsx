import React from "react";

import { UiPluginsContext, UiSlotId } from "components/utils/ui-plugins";

export enum UiChangeOperation {
    Insert = "insert",
    Hide = "hide",
    Modify = "modify",
    Wrap = "wrap",
}

export type UiSlotChange =
    | { op: UiChangeOperation.Insert; widget: UISlotWidget<unknown> }
    | { op: UiChangeOperation.Hide; widgetId: string }
    | { op: UiChangeOperation.Modify; widgetId: string, fn: (widget: UISlotWidget<unknown>) => UISlotWidget<unknown> }
    | { op: UiChangeOperation.Wrap; widgetId: string, wrapper: React.FC<{widget: React.ReactElement}> };

/**
 * Some widget that appears in a UI slot
 */
export interface UISlotWidget<ContentType = React.ReactElement> {
    id: string;
    /** Only some slots will display the labels of widgets, and possibly only sometimes (e.g. only on mobile) */
    // label?: React.ReactElement;
    /** Priority, 0 comes first, 100 comes last */
    priority: number;
    /** If a widget in a slot is hidden, it won't be rendered at all. */
    hidden?: boolean;
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
        const contents: (UISlotWidget<ContentType> & {wrappers?: React.FC<{widget: React.ReactElement}>[]})[] = [...props.defaultContents ?? []];
        for (const p of pluginsData.plugins) {
            for (const change of (p.uiSlotChanges?.[props.slotId as UiSlotId] ?? [])) {
                if (change.op === UiChangeOperation.Insert) {
                    contents.push(change.widget as UISlotWidget<ContentType>);
                } else if (change.op === UiChangeOperation.Hide) {
                    const widget = contents.find((w) => w.id === change.widgetId);
                    if (widget) {
                        widget.hidden = true;
                    }
                } else if (change.op === UiChangeOperation.Modify) {
                    const widgetIdx = contents.findIndex((w) => w.id === change.widgetId);
                    if (widgetIdx >= 0) {
                        const widget = {...contents[widgetIdx]};
                        contents[widgetIdx] = change.fn(widget) as UISlotWidget<ContentType>;
                    }
                } else if (change.op === UiChangeOperation.Wrap) {
                    const widgetIdx = contents.findIndex((w) => w.id === change.widgetId);
                    if (widgetIdx >= 0) {
                        const newWidget = {wrappers: [], ...contents[widgetIdx]};
                        newWidget.wrappers.push(change.wrapper as React.FC<{widget: React.ReactElement}>);
                        contents[widgetIdx] = newWidget;
                    }
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    throw new Error(`unknown plugin UI change operation: ${(change as any).op}`);
                }
            }
        }
        // Sort first by priority, then by ID
        contents.sort((a, b) => (a.priority - b.priority) * 10_000 + a.id.localeCompare(b.id));
        return contents;
    }, [props.defaultContents, pluginsData, props.slotId]);

    return (
        <>
            {contents.map((c) =>
                c.hidden ? null :
                c.wrappers ? c.wrappers.reduce((widget, wrapper) => React.createElement(wrapper, {widget}), props.renderWidget(c)) :
                props.renderWidget(c)
            )}
        </>
    );
};

/**
 * A UI slot is a placeholder in the user interface that can be filled with various content/widgets, and in particular
 * which plugins can modify. This particular type of UI slot just wraps any React component and allows plugins to insert
 * HTML before it or after it, or to hide it.
 */
export const DefaultUISlot: React.FunctionComponent<{ slotId: string; children?: React.ReactNode }> = (props) => {
    return (
        <UISlot
            slotId={props.slotId}
            renderWidget={defaultRender}
            defaultContents={props.children ? [{ id: "content", priority: 50, content: <>{props.children}</> }] : []}
        />
    );
};
