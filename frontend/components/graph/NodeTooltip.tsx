import React from "react";
import type { VirtualElement } from "@popperjs/core";
import type { Graph } from "@antv/g6";
import { Tooltip } from "components/widgets/Tooltip";
import { InlineMDT, MDTContext } from "components/markdown-mdt/mdt";
import Link from "next/link";
import { EntryTooltipContent } from "components/EntryTooltipContent";
import { VNID } from "neolace-api";

/**
 * This is a React hook that consolidates the complex logic required to calculate where a tooltip should be displayed on
 * the screen for a given Node in the G6 graph.
 *
 * It computes the actual position and size of the node, using the browser's coordinate system. Then it returns a
 * "VirtualElement" representing the node's position and size. This allows our tooltip placement code (Popper.js) to
 * position the tooltip correctly. See https://popper.js.org/docs/v2/virtual-elements/ for details.
 */
export function useNodeTooltipHelper(
    graph: Graph | null,
    graphContainer: HTMLDivElement | undefined,
): [
    showTooltipForNode: string | undefined,
    setShowTooltipForNode: (id: string | undefined) => void,
    tooltipVirtualElement: VirtualElement,
] {
    // The ID of the node whose tooltip we want to display at the moment, if any.
    const [showTooltipForNode, setShowTooltipForNode] = React.useState<string | undefined>(undefined);
    const getTooltipNodeBounds = React.useCallback<VirtualElement["getBoundingClientRect"]>(() => {
        // This is the complicated calculation required to display a tooltip in the right place.
        const selectedNode = graph?.getNodes().find((n) => n.getModel().id === showTooltipForNode);
        // Get the coordinates and size of the node, use the graph's coordinate system:
        const boundingBox = selectedNode?.getCanvasBBox() ??
            { x: 0, y: 0, minX: 0, minY: 0, width: 0, height: 0, maxX: 0, maxY: 0 };
        // Get the top left coordinates of the selected node, in the browser's coordinate system, relative to the canvas:
        const nodeCanvasPosition = graph?.getCanvasByPoint(boundingBox.x, boundingBox.y) ?? { x: 0, y: 0 };
        const nodeCanvasBottomRight =
            graph?.getCanvasByPoint(boundingBox.x + boundingBox.width, boundingBox.y + boundingBox.height) ??
                { x: 0, y: 0 };
        const nodeCanvasSize = {
            x: nodeCanvasBottomRight.x - nodeCanvasPosition.x,
            y: nodeCanvasBottomRight.y - nodeCanvasPosition.y,
        };
        // Get the position of the graph/canvas in the browser's coordinate system:
        const countainerBox = graphContainer?.getBoundingClientRect() ?? new DOMRectReadOnly(0, 0, 0, 0);
        return new DOMRectReadOnly(
            countainerBox.x + nodeCanvasPosition.x,
            countainerBox.y + nodeCanvasPosition.y,
            nodeCanvasSize.x,
            nodeCanvasSize.y,
        );
    }, [graph, graphContainer, showTooltipForNode]);

    const tooltipVirtualElement: VirtualElement = React.useMemo<VirtualElement>(
        () => ({ getBoundingClientRect: getTooltipNodeBounds }),
        [getTooltipNodeBounds],
    );

    return [showTooltipForNode, setShowTooltipForNode, tooltipVirtualElement];
}

interface TooltipProps {
    showTooltipForNode: string|undefined;
    tooltipVirtualElement: VirtualElement;
    mdtContext: MDTContext;
}

/**
 * Display a tooltip for the currently selected node.
 */
export const NodeTooltip: React.FunctionComponent<TooltipProps> = (props: TooltipProps) => {
    if (props.showTooltipForNode === undefined) {
        return <></>
    }
    return <Tooltip
        forceVisible={true}
        tooltipContent={<EntryTooltipContent
            entryId={props.showTooltipForNode as VNID}
            mdtContext={props.mdtContext}
        />}
    >{props.tooltipVirtualElement}</Tooltip>;
}
