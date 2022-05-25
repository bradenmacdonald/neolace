/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import { api } from "lib/api-client";
import { MDTContext } from "../markdown-mdt/mdt";
import G6, { Graph, GraphOptions, INode, NodeConfig } from "@antv/g6";
import { useResizeObserver } from "../utils/resizeObserverHook";
import { EntryColor, entryNode, pickEntryTypeLetter } from "./Node";
import { VNID } from "neolace-api";
import { ToolbarButton } from "../widgets/Button";
import { useIntl } from "react-intl";
import { useStateRef } from "../utils/stateRefHook";
import { applyTransforms, Transform, Transforms } from "./Transforms";
import { Modal } from "../widgets/Modal";
import { NodeTooltip, useNodeTooltipHelper } from "./NodeTooltip";

export interface GraphProps {
    value: api.GraphValue;
    mdtContext: MDTContext;
    children?: never;
}

let nextColor = 0;
const colourMap = new Map<VNID, EntryColor>();

export interface G6RawGraphData {
    nodes: {
        id: VNID;
        label: string;
        entryType: VNID;
        isFocusEntry?: boolean;
        leavesCondensed?: Set<string>;
    }[];
    edges: {
        id: VNID;
        source: string;
        target: string;
        relType: VNID;
        label: string;
        [other: string]: unknown; // attributes
    }[];
}


function colorGraph(data: G6RawGraphData, refCache: api.ReferenceCacheData) {
    data.nodes.forEach((node: NodeConfig) => {
        if (!colourMap.has(node.entryType as VNID)) {
            colourMap.set(node.entryType as VNID, Object.values(EntryColor)[nextColor]);
            nextColor = (nextColor + 1) % Object.values(EntryColor).length;
        }
        node.color = colourMap.get(node.entryType as VNID);
        node.leftLetter = pickEntryTypeLetter(refCache.entryTypes[node.entryType as VNID]?.name);
    });

    return data;
}

function convertValueToData(value: api.GraphValue, refCache: api.ReferenceCacheData) {
    let data: G6RawGraphData = {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: n.name, entryType: n.entryType, isFocusEntry: n.isFocusEntry }
        )),
        edges: value.rels.map((e) => (
            {
                id: e.relId,
                source: e.fromEntryId,
                target: e.toEntryId,
                relType: e.relType,
                label: refCache.properties[e.relType]?.name ?? e.relType,
            }
        )),
    };
    
    data = colorGraph(data, refCache);
    return data;
}

/**
 * Display a graph visualization.
 */
export const LookupGraph: React.FunctionComponent<GraphProps> = (props) => {
    const intl = useIntl();
    const [hidden, setHidden, hiddenRef] = useStateRef(false);
    const [expand, setExpand, expandRef] = useStateRef(false);
    // The data (nodes and relationships) that we want to display as a graph.
    const originalData = React.useMemo(() => {
        return convertValueToData(props.value, props.mdtContext.refCache);
    }, [props.value]);
    const [transformList, setTransforms, currentTransforms] = useStateRef<Transform[]>([]);

    const currentData = React.useMemo(() => {
        let transformedData = applyTransforms(originalData, transformList);
        transformedData = colorGraph(transformedData, props.mdtContext.refCache);
        return transformedData;
    }, [originalData, transformList, props.mdtContext.refCache])

    // In order to preserve our G6 graph when we move it to a modal (when expanding the view), the <div> that contains
    // it must not be destroyed and re-created. React will normally try to destroy and re-create it, not realizing that
    // doing so will destroy G6's <canvas> element. So what we do is create this wrapper <div> that holds the G6 canvas,
    // and we manage this wrapper div manually. When React changes which <div> contains this wrapper <div>, we'll move
    // it to the new DOM location ourselves. That way, the <canvas> that G6 needs does not get destroyed.
    const [graphContainer] = React.useState(() => {
        if (typeof document === "undefined") {
            return undefined;
        }
        // Create a persistent <div> that gets saved into this <LookGraph> component's state. This <div> will never
        // change for the entire lifetime of this <LookupGraph> component.
        const _graphContainer = document.createElement("div");
        _graphContainer.style.width = "100%";
        _graphContainer.style.height = "100%";
        _graphContainer.style.overflow = "none";
        return _graphContainer;
    });
    // This gets called by React when the outer <div> that holds the above graphContainer has changed.
    const updateGraphHolder = React.useCallback((newGraphHolderDiv: HTMLDivElement|null) => {
        // Move graphContainer into the new parent div, or detach it from the DOM and keep it in memory only (if the new
        // parent div isn't ready yet).
        if (!newGraphHolderDiv) {
            graphContainer?.parentElement?.removeChild(graphContainer);
        } else if (graphContainer) {
            newGraphHolderDiv.appendChild(graphContainer);
        }
    }, []);  // "graphContainer" will never change (we don't define a "set" function), so we don't need to depend on it.

    // "graph" is the actual G6 graph instance which owns a <canvas> element, and renders the graph.
    // See https://g6.antv.vision/en/docs/api/Graph
    const [graph, setGraph] = React.useState<Graph | null>(null);

    // Create a reference (an object that holds mdtContext) that we can pass to the tooltip,
    // so that the tooltip can always access the mdtContext and we don't have to re-create the
    // tooltip plugin whenever the mdtContext changes.
    // const mdtContextRef = React.useRef<MDTContext>(props.mdtContext);
    // React.useEffect(() => { mdtContextRef.current = props.mdtContext; }, [props.mdtContext]);

    // Our G6 Graph configuration
    const graphConfig: Partial<GraphOptions> = React.useMemo(() => ({
        plugins: [],
        layout: {
            type: 'force',
            preventOverlap: true,
            nodeSize: [200, 50],
            nodeSpacing: 60,
            alphaMin: 0.1,
        },
        defaultNode: {
            type: entryNode,
        },
        defaultEdge: {
            type: "line",
            /* configure the bending radius and min distance to the end nodes */
            style: {
                radius: 10,
                offset: 30,
                endArrow: {
                    path: G6.Arrow.triangle(10, 20, 0),
                    d: 0,
                    fill: "#ddd",
                },
                lineWidth: 2,
                stroke: "#ddd",
                /* and other styles */
                // stroke: '#F6BD16',
            },
        },
        modes: {
            default: ["drag-canvas", "click-select", "zoom-canvas", 'drag-node'],
        },
        edgeStateStyles: {
            selected: {
                lineWidth: 3,
                stroke: '#f00'
            }
        }
    }), []);

    // Initialize the G6 graph, once we're ready
    React.useEffect(() => {
        if (!graphContainer) {
            return;  // We can't (re-)initialize the graph yet, 
            // because we don't have a valid reference to the <div> that will hold it.
        }
        const container = graphContainer;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const newGraph = new G6.Graph({ container, width, height, ...graphConfig });
        setGraph((oldGraph) => {
            if (oldGraph) {
                // If there already was a graph, destroy it because we're about to re-create it.
                oldGraph.destroy();
            }
            return newGraph;
        });
    }, [graphConfig, graphContainer]);

    // Set the graph data and render it whenever the data has changed or the graph has been re-initialized:
    React.useEffect(() => {
        if (!graph || graph.destroyed) { return; }
        graph.data(originalData);
        graph.render();
        // By default, we zoom the graph so that four nodes would fit horizontally.
        graph.zoomTo(graph.getWidth()/(220*4), undefined, false);
        graph.on("afterlayout", () => {
            if (!graph || graph.destroyed) { return; }
            // Zoom to focus on whatever node came first in the data:
            const firstNode = graph.getNodes().find((node) => node.getModel().isFocusEntry);
            if (firstNode) {
                graph.setItemState(firstNode, "selected", true);
                graph.focusItem(firstNode, true);
            }
        }, true);
        // We'll control the cursor using CSS:
        graph.get('canvas').setCursor('inherit');
    }, [graph, originalData]);

    // Update the graph data whenever the current data changes
    React.useEffect(() => {
        if (!graph || graph.destroyed) { return; }
        graph.changeData(currentData);
    }, [currentData])

    const [showTooltipForNode, setShowTooltipForNode, tooltipVirtualElement] = useNodeTooltipHelper(graph, graphContainer);

    // Set up G6 event handlers whenever the graph has been initialized for the first time or re-initialized
    React.useEffect(() => {
        if (!graph || graph.destroyed) { return; }

        //  when a node is selected, show the neighbouring nodes and connecting edges as selected.
        // NOTE the built in node and edge states are: active, inactive, selected, highlight, disable
        // styles for the states can be configured.
        graph.on("node:dblclick", function (e) {
            const item = e.item as INode;
            // if it is this node or connected node, then highlight
            graph.getNodes().forEach((node) => {
                if (node === item) {
                    graph.setItemState(node, 'disabled', false);
                    graph.setItemState(node, 'selected', true);
                } else if (item.getNeighbors().includes(node)) {
                    graph.setItemState(node, 'disabled', false);
                    graph.setItemState(node, 'selected', true);
                } else {
                    graph.setItemState(node, 'disabled', true);
                }
            })

            // if it is a connected edge, then highlight:
            graph.getEdges().forEach((edge) => {
                if (
                    ((edge.getSource().getID() === item.getID()) ||
                        (edge.getTarget().getID() === item.getID()))
                ) {
                    graph.setItemState(edge, 'selected', true);
                    graph.setItemState(edge, 'disabled', false);
                } else {
                    graph.setItemState(edge, 'disabled', true);
                    graph.setItemState(edge, 'selected', false);
                }
            })
        });

        graph.on("node:click", function(e) {
            const item = e.item as INode;
            if (hiddenRef.current) {
                setTransforms((t) => {
                    return t.concat({
                        id: Transforms.HIDETYPE,
                        params: {'nodeType': item.getModel().entryType as string},
                    });
                })
                setHidden(false);

            } else if (item.getModel().leavesCondensed && expandRef.current) {
                console.log('The node to expand is',  item.getNeighbors()[0].getModel().id);
                console.log('The node is ', item.getNeighbors()[0].getModel().label)
                setTransforms((prevTransforms) => [...prevTransforms, {
                    id: Transforms.EXPANDLEAF, 
                    // instead of this node id, get type and parent
                    // should have only one neighbour
                    params: {parentKey: item.getNeighbors()[0].getModel().id, entryType: item.getModel().entryType}
                }])
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        graph.on("nodeselectchange" as any, (e) => { // the type says it's not allowed but it works
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selectedNodes = (e.selectedItems as any).nodes as INode[];
            if (selectedNodes.length === 1 && !hiddenRef.current) {
                // Show a tooltip for this node, since there's exactly one node selected:
                setShowTooltipForNode(selectedNodes[0].getModel().id);
            } else {
                // Clear the tooltip if 0 or 2+ nodes are selected:
                setShowTooltipForNode(undefined);
            }
            // The current manipulated item
            // console.log(e.target);
            // The set of selected items after this operation
            // console.log(e.selectedItems);
            // A boolean tag to distinguish if the current operation is select(`true`) or deselect (`false`)
            // console.log(e.select);
        });

        // allow selection of edges
        graph.on('edge:mouseenter', (e) => {
            if (!e.item) { return; }
            const { item } = e;
            graph.setItemState(item, 'active', true);
        });

        graph.on('edge:mouseleave', (e) => {
            if (!e.item) { return; }
            const { item } = e;
            graph.setItemState(item, 'active', false);
        });

        graph.on('edge:click', (e) => {
            if (!e.item) { return; }
            const { item } = e;
            graph.setItemState(item, 'selected', true);
        });
        graph.on('canvas:click', (e) => {
            graph.getEdges().forEach((edge) => {
                graph.clearItemStates(edge);
            });
            graph.getNodes().forEach((node) => {
                graph.clearItemStates(node);
            });
        });

        // Hover effect:
        graph.on("node:mouseenter", function (e) {
            e.item?.setState("hover", true);
        });
        graph.on("node:mouseleave", function (e) {
            e.item?.setState("hover", false);
        });
    }, [graph]);

    // Fix bug that occurs in Firefox only: scrolling the mouse wheel on the graph also scrolls the page.
    React.useEffect(() => {
        graphContainer?.addEventListener("MozMousePixelScroll", (e) => {
            e.preventDefault();
        }, { passive: false });
    }, []);

    // Automatically resize the graph if the containing element changes size.
    const handleSizeChange = React.useCallback(() => {
        if (!graph || graph.destroyed || !graphContainer) return;
        const width = graphContainer.clientWidth, height = graphContainer.clientHeight;
        if (graph.getWidth() !== width || graph.getHeight() !== height) {
            graph.changeSize(width, height);
            graph.fitView();
        }
    }, [graph, graphContainer]);
    useResizeObserver(graphContainer, handleSizeChange);

    // Code for "toggle expanded view" toolbar button
    const [expanded, setExpanded] = React.useState(false);
    const handleExpandCanvasButton = React.useCallback(() => { setExpanded((wasExpanded) => !wasExpanded); }, []);
    // Code for "zoom" toolbar buttons
    const zoomRatio = 1.20; // Zoom in by 20% each time
    const handleZoomInButton = React.useCallback(() => {
        graph?.zoom(zoomRatio, graph?.getViewPortCenterPoint());
    }, [graph]);
    const handleZoomOutButton = React.useCallback(() => {
        graph?.zoom(1 / zoomRatio, graph?.getViewPortCenterPoint());
    }, [graph]);
    // Code for "fit view" button
    const handleFitViewButton = React.useCallback(() => { graph?.fitView(10, { direction: "both" }); }, [graph]);
    // Code for "download as image" toolbar button
    const handleDownloadImageButton = React.useCallback(() => { graph?.downloadFullImage(); }, [graph]);
    // Code for "Condense leaves" toolbar button
    const isCondensed = transformList.find((t) => t.id === Transforms.CONDENSE) !== undefined;
    const handleCondenseNodesButton = React.useCallback(() => {
        if (isCondensed) {
            setTransforms((prevTransforms) => prevTransforms.filter((t) => (t.id !== Transforms.CONDENSE) && t.id !== Transforms.EXPANDLEAF));
        } else {
            setTransforms((prevTransforms) => [...prevTransforms, {id: Transforms.CONDENSE, params: {}}]);
        }
    }, [isCondensed, setTransforms]);

    const handleExpandLeafButton = React.useCallback(() => {
        setExpand((wasExpanded) => !wasExpanded)
    }, []);
    // Code for "Hide article antries" toolbar button
    const handleHideArticlesButton = React.useCallback(() => { setHidden((wasHidden) => !wasHidden); }, []);

    const contents = (
        <>
            <div className="block w-full border-b-[1px] border-gray-500 bg-gray-100 p-1">
                <ToolbarButton
                    onClick={handleExpandCanvasButton}
                    title={intl.formatMessage({ defaultMessage: "Toggle expanded view", id: "graph.toolbar.expand" })}
                    icon={expanded ? "arrows-angle-contract" : "arrows-angle-expand"}
                />
                <ToolbarButton
                    onClick={handleZoomInButton}
                    title={intl.formatMessage({ defaultMessage: "Zoom in", id: "graph.toolbar.zoomIn" })}
                    icon="zoom-in"
                />
                <ToolbarButton
                    onClick={handleZoomOutButton}
                    title={intl.formatMessage({ defaultMessage: "Zoom out", id: "graph.toolbar.zoomOut" })}
                    icon="zoom-out"
                />
                <ToolbarButton
                    onClick={handleFitViewButton}
                    title={intl.formatMessage({ defaultMessage: "Fit graph to view", id: "graph.toolbar.fitView" })}
                    icon="aspect-ratio"
                />
                <ToolbarButton
                    onClick={handleDownloadImageButton}
                    title={intl.formatMessage({
                        defaultMessage: "Download entire graph as an image",
                        id: "graph.toolbar.downloadImage",
                    })}
                    icon="image"
                />
                <ToolbarButton
                    onClick={handleCondenseNodesButton}
                    title={intl.formatMessage({
                        defaultMessage: "Condense leaves and intermediate nodes",
                        id: "graph.toolbar.condenseNodes",
                    })}
                    icon="chevron-contract"
                    enabled={isCondensed}
                />
                <ToolbarButton
                    onClick={handleHideArticlesButton}
                    title={intl.formatMessage({
                        defaultMessage: "Hide entries tool: click on an entry to hide all entries of that type.",
                        id: "graph.toolbar.hideArticles",
                    })}
                    icon="eraser"
                    enabled={hidden}
                />
                <ToolbarButton
                    onClick={handleExpandLeafButton}
                    title={intl.formatMessage({
                        defaultMessage: "Expand leaf tool",
                        id: "graph.toolbar.hideArticles",
                    })}
                    icon="eraser"
                    enabled={expand}
                />
            </div>
            <div
                ref={updateGraphHolder}
                className="relative bg-white overflow-hidden w-screen max-w-full h-screen max-h-full"
                style={hidden ? {cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z'/%3E%3C/svg%3E") 3 16, crosshair`} : {}}
            >
                {/* in here is 'graphContainer', and which holds a <canvas> element. */}
            </div>
            {/* A tooltip that displays information about the currently selected entry node. */}
            <NodeTooltip
                showTooltipForNode={showTooltipForNode}
                mdtContext={props.mdtContext}
                tooltipVirtualElement={tooltipVirtualElement}
            />
        </>
    );

    if (expanded) {
        // Display the graph and controls in a modal (dialog/overlay),
        // centered on the screen and no bigger than the screen.
        return (
            <Modal
                onClose={handleExpandCanvasButton}
                className={`
                    flex flex-col rounded border-2 border-gray-200 w-auto h-auto
                    max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]
                `}
            >
                {contents}
            </Modal>
        );
    } else {
        // Display the graph in our parent element, making it as wide as possible, and setting the height based
        // on an aspect ratio (square on mobile, 16:9 on desktop)
        return (
            <div className={`
                flex flex-col rounded border-2 border-gray-200 w-auto h-auto
                aspect-square md:aspect-video max-w-full
            `}>
                {contents}
            </div>
        );
    }
};
