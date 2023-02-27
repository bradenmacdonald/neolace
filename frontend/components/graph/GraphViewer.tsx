/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import { SDK } from "lib/sdk";
import { MDTContext } from "../markdown-mdt/mdt";
import G6, { EdgeConfig, Graph as G6Graph, GraphOptions, IG6GraphEvent, INode, NodeConfig } from "@antv/g6";
import { useResizeObserver } from "lib/hooks/useResizeObserver";
import "./graph-g6-node";
import "./graph-g6-placeholder";
import { ToolbarButton, ToolbarSeparator } from "../widgets/Button";
import { IntlShape, useIntl } from "react-intl";
import { useStateRef } from "lib/hooks/useStateRef";
import { DetectCommunitiesTransformer, LayoutPipelineTransformer, RemovePlaceholdersTransformer } from "./graph-transforms";
import { Modal } from "components/widgets/Modal";
import { NodeTooltip, useNodeTooltipHelper } from "./NodeTooltip";
import { defineMessage } from "components/utils/i18n";
import { debugLog } from "lib/config";
import { EdgeAttributes, GraphData, NodeAttributes, NodeType } from "./graph-data";
import { Frame, FrameBody, FrameHeader } from "components/widgets/Frame";

interface Props {
    data: GraphData;
    /**
     * Users can expand the graph by clicking on "placeholder" nodes, which will trigger this callback to load more
     * entries into the graph.
     */
    expandPlaceholder: (placeholderId: string) => void;
    children?: never;
}

/** The different "tools" that can be active for manipulating the graph */
enum Tool {
    // Normal selection tool
    Select,
    HideNodes,
    CondenseExpandNode,
}

/** A map of which transforms are active, and optionally detailed settings for the active ones that accept options. */
interface ActiveTransforms {
    removePlaceholders?: boolean;
    detectCommunities?: boolean;
    detectCliques?: boolean;
    condenseLeaves?: boolean;
}

const noTransforms: ActiveTransforms = Object.freeze({});

/**
 * Display a graph visualization.
 */
export const GraphViewer: React.FunctionComponent<Props> = (props) => {
    const intl = useIntl();
    const mdtContext = React.useMemo(() => new MDTContext({}), []);
    const {expandPlaceholder} = props;
    const [activeTool, setActiveTool, activeToolRef] = useStateRef(Tool.Select);
    /** Is the graph currently expanded (displayed in a large modal?) */
    const [expanded, setExpanded, expandedRef] = useStateRef(false);

    const [activeTransforms, setActiveTransforms] = React.useState<ActiveTransforms>(noTransforms);

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
    const updateGraphHolder = React.useCallback((newGraphHolderDiv: HTMLDivElement | null) => {
        // Move graphContainer into the new parent div, or detach it from the DOM and keep it in memory only (if the new
        // parent div isn't ready yet).
        if (!newGraphHolderDiv) {
            graphContainer?.parentElement?.removeChild(graphContainer);
        } else if (graphContainer) {
            newGraphHolderDiv.appendChild(graphContainer);
        }
    }, [graphContainer]); // But we expect that "graphContainer" should never change (we don't define a "set" function)

    // "graph" is the actual G6 graph instance which owns a <canvas> element, and renders the graph.
    // See https://g6.antv.vision/en/docs/api/Graph
    const [graph, setGraph] = React.useState<G6Graph | null>(null);

    // Our custom tooltip controller that can display tooltips for each node:
    const [showTooltipForNode, setShowTooltipForNode, tooltipVirtualElement] = useNodeTooltipHelper(
        graph,
        graphContainer,
    );

    // Our G6 Graph configuration
    const graphConfig: Partial<GraphOptions> = React.useMemo(() => ({
        plugins: [],
        animate: true,
        layout: {
            // Use a DAGRE layout for any nodes that have a logical hierarchy, then force layout for the rest.
            pipes: [
                {
                    // First, apply a dagre layout to any nodes/edges that have "IS A" relationships to each other.
                    // This includes entry nodes and placeholders.
                    type: "dagre",
                    rankdir: "BT",
                    // indicate if the node belongs to the subgraph
                    nodesFilter: (node: NodeAttributes) => node._hasIsARelationship,
                    edgesFilter: (edge: EdgeAttributes) => edge._isIsARelationship,
                    ranksep: 30,
                    nodesep: 95,
                },
                {
                    // Next, lay out all the other nodes that aren't placeholders:
                    type: "gForce",
                    nodesFilter: (node: NodeConfig) => {
                        // This is a hack: if the nodes have been layed out by DAGRE, fix their position.
                        // Now the force layout will react to them but won't move them. We only want it to move the
                        // remaining nodes (and placeholders)
                        if (node._hasIsARelationship) {
                            node.fx = node.x;
                            node.fy = node.y;
                        }
                        return true;
                    },
                    // Disable gravity - we don't want to pull all the nodes toward the centre. They start there anyways.
                    gravity: 0,
                    // Repulsive force between the nodes:
                    nodeStrength: (node: NodeAttributes) => 10_000,
                    // attractive strength of the edges:
                    edgeStrength: (edge: EdgeAttributes) => 200,
                    // Short range repulsive force: A smaller value keeps the nodes farther apart from each other. Default 0.005
                    coulombDisScale: 0.004,

                    // These seem to have no effect:
                    // gpuEnabled: true,
                    // preventOverlap: true,
                    // nodeSize: 200,
                    // nodeSpacing: 600,
                },
            ],
        },
        defaultNode: {},
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
                lineWidth: 3,
                stroke: "#ddd",
            },
            labelCfg: {
                style: {
                    stroke: "#000",
                    fontSize: 12,
                    background: {
                      fill: '#ffffff',
                      padding: [5, 5, 5, 5],
                      radius: 5,
                    },
                },
            }
        },
        defaultCombo: {
            type: "circle",
            size: [80],
            labelCfg: {
                style: {
                    fontSize: 18,
                },
            },
            /* style for the keyShape */
            style: {
                fill: "#cffafe",
                opacity: 0.3,
            },
        },
        modes: {
            default: [
                "drag-canvas",
                "click-select",
                {
                    type: "zoom-canvas",
                    // When not in fullscreen, we don't use the mousewheel to zoom because it's annoying when it zooms
                    // "accidentally" as you try to scroll down while reading the page, not meaning to zoom the graph.
                    // However, if this event is a "touchstart" event (pinch to zoom on mobile), we always zoom.
                    shouldBegin: (evt?: IG6GraphEvent) => expandedRef.current || evt?.type === "touchstart",
                    // Adjust the sensitivity a bit (range 0-10, default 5 is a bit too sensitive)
                    sensitivity: 2,
                },
                "drag-node",
                "drag-combo",
                {
                    type: "collapse-expand-combo",
                    relayout: false,
                },
            ],
        },
        edgeStateStyles: {
            selected: {
                lineWidth: 3,
                stroke: "#f00",
            },
        },
        minZoom: 0.005,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), []); // We don't need to include 'expandedRef' because it never changes, and we don't want this 'config' to change in general, as we don't want to constantly re-initialize G6.

    // Initialize the G6 graph, once we're ready
    React.useEffect(() => {
        if (!graphContainer) {
            return; // We can't (re-)initialize the graph yet,
            // because we don't have a valid reference to the <div> that will hold it.
        }
        debugLog("Initializing G6 graph");
        const container = graphContainer;
        const width = container.clientWidth;
        const height = container.clientHeight;
        // NOTE: this local 'graph' variable shadows the 'graph' in the React state, but that makes this function cleaner
        const graph = new G6.Graph({ container, width, height, ...graphConfig });
        setGraph((oldGraph) => {
            if (oldGraph) {
                // If there already was a graph, destroy it because we're about to re-create it.
                oldGraph.destroy();
            }
            return graph;
        });
        // By default, we zoom the graph so that seven nodes would fit horizontally.
        graph.zoomTo(graph.getWidth() / (220 * 7), undefined, false);
        // We'll control the cursor using CSS:
        graph.get("canvas").setCursor("inherit");

        // Set up event handlers:

        //  when a node is selected, show the neighbouring nodes and connecting edges as selected.
        // NOTE the built in node and edge states are: active, inactive, selected, highlight, disable
        // styles for the states can be configured.
        graph.on("node:dblclick", function (e) {
            const item = e.item as INode;
            // if it is this node or connected node, then highlight
            graph.getNodes().forEach((node) => {
                if (node === item) {
                    graph.setItemState(node, "disabled", false);
                    graph.setItemState(node, "selected", true);
                } else if (item.getNeighbors().includes(node)) {
                    graph.setItemState(node, "disabled", false);
                    graph.setItemState(node, "selected", true);
                } else {
                    graph.setItemState(node, "disabled", true);
                }
            });

            // if it is a connected edge, then highlight:
            graph.getEdges().forEach((edge) => {
                if (
                    ((edge.getSource().getID() === item.getID()) ||
                        (edge.getTarget().getID() === item.getID()))
                ) {
                    graph.setItemState(edge, "selected", true);
                    graph.setItemState(edge, "disabled", false);
                } else {
                    graph.setItemState(edge, "disabled", true);
                    graph.setItemState(edge, "selected", false);
                }
            });
        });

        graph.on("node:click", function (e) {
            const item = e.item as INode;

            if (item.getModel().type === NodeType.Placeholder) {
                expandPlaceholder(item.getID());
                return;
            }

            // Can implement tools here. (when X tool is active, clicking a node has Y effect.)
        });

        graph.on("nodeselectchange", (e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const selectedNodes = (e.selectedItems as any).nodes as INode[];
            if (selectedNodes.length === 1 && activeToolRef.current === Tool.Select) {
                const nodeData = selectedNodes[0].getModel();
                // Show a tooltip for this node, since there's exactly one node selected:
                setShowTooltipForNode(nodeData.type === NodeType.Entry ? selectedNodes[0].getModel().id : undefined);
            } else {
                // Clear the tooltip if 0 or 2+ nodes are selected:
                setShowTooltipForNode(undefined);
            }
        });

        graph.on("edge:click", (e) => { e.item?.setState("selected", true); });

        // Hover effect:
        graph.on("node:mouseenter", (e) => { e.item?.setState("hover", true); });
        graph.on("node:mouseleave", (e) => { e.item?.setState("hover", false); });
        graph.on("edge:mouseenter", (e) => { e.item?.setState("active", true); });
        graph.on("edge:mouseleave", (e) => { e.item?.setState("active", false); });

        // Selecting items:
        graph.on("canvas:click", (e) => {
            // Clear all selections when clicking on the canvas (the background):
            graph.getEdges().forEach((edge) => { graph.clearItemStates(edge); });
            graph.getNodes().forEach((node) => { graph.clearItemStates(node); });
        });
    }, [
        graphConfig,
        graphContainer,
        activeToolRef, // <- will never change, but eslint doesn't know that.
        setActiveTool, // <- will never change, but eslint doesn't know that.
        setShowTooltipForNode, // <- will never change, but eslint doesn't know that.
        expandPlaceholder, // <- will never change, but eslint doesn't know that.
    ]);

    // Update the graph data whenever the current data changes
    React.useEffect(() => {
        if (!graph || graph.destroyed) return;
        updateGraphData(graph, props.data, activeTransforms, intl);
    }, [graph, props.data, activeTransforms, intl]);

    // Fix bug that occurs in Firefox only: scrolling the mouse wheel on the graph also scrolls the page.
    React.useEffect(() => {
        // When not in fullscreen, we don't use the mousewheel to zoom because it's annoying when it zooms as you try
        // to scroll down while reading the page.
        if (expanded) {
            const firefoxScrollBlocker = (e: Event) => { e.preventDefault(); };
            graphContainer?.addEventListener("MozMousePixelScroll", firefoxScrollBlocker, { passive: false });
            return () => {
                graphContainer?.removeEventListener("MozMousePixelScroll", firefoxScrollBlocker);
            };
        }
    }, [graphContainer, expanded]);

    // Automatically resize the graph if the containing element changes size.
    const handleSizeChange = React.useCallback(() => {
        if (!graph || graph.destroyed || !graphContainer) return;
        const width = graphContainer.clientWidth, height = graphContainer.clientHeight;
        if (graph.getWidth() !== width || graph.getHeight() !== height) {
            debugLog(`Graph container has changed size - fitting the graph to view.`);
            graph.changeSize(width, height);
            graph.fitView();
        }
    }, [graph, graphContainer]);
    useResizeObserver(graphContainer, handleSizeChange);

    // Code for "toggle expanded view" toolbar button
    const handleExpandCanvasButton = React.useCallback(() => {
        setExpanded((wasExpanded) => !wasExpanded);
    }, [setExpanded]);
    // Code for "zoom" toolbar buttons
    const zoomRatio = 1.50; // Zoom in by 50% each time
    const handleZoomInButton = React.useCallback(() => {
        graph?.zoom(zoomRatio, { x: graph.getWidth() / 2, y: graph.getHeight() / 2 }, true, { duration: 100 });
    }, [graph]);
    const handleZoomOutButton = React.useCallback(() => {
        graph?.zoom(1 / zoomRatio, { x: graph.getWidth() / 2, y: graph.getHeight() / 2 }, true, { duration: 100 });
    }, [graph]);
    // Code for "fit view" button
    const handleFitViewButton = React.useCallback(() => { graph?.fitView(10, { direction: "both" }); }, [graph]);
    // Code for "download as image" toolbar button
    const handleDownloadImageButton = React.useCallback(() => { graph?.downloadFullImage(); }, [graph]);

    // Code for detecting communities toolbar button
    const isCommunized = activeTransforms.detectCommunities;
    const handleCommunityButton = React.useCallback(() => {
        setActiveTransforms((prevTransforms) => ({
            ...prevTransforms,
            detectCommunities: !prevTransforms.detectCommunities,
        }));
    }, []);
    // Tools:
    const handleSelectToolButton = React.useCallback(() => {
        setActiveTool(Tool.Select);
    }, [setActiveTool]);
    // Code for "show placeholders" toolbar button
    const showPlaceholders = !activeTransforms.removePlaceholders;
    const handleTogglePlaceholdersButton = React.useCallback(() => {
        setActiveTransforms((prevTransforms) => ({
            ...prevTransforms,
            removePlaceholders: !prevTransforms.removePlaceholders,
        }));
    }, []);

    const contents = (
        <>
            <FrameHeader>
                <ToolbarButton
                    onClick={handleExpandCanvasButton}
                    tooltip={defineMessage({ defaultMessage: "Toggle expanded view", id: "k4UVvX" })}
                    icon={expanded ? "arrows-angle-contract" : "arrows-angle-expand"}
                />
                <ToolbarButton
                    onClick={handleTogglePlaceholdersButton}
                    tooltip={defineMessage({
                        defaultMessage: "Show placeholders where additional entries can be loaded into the graph",
                        id: "ABp3x6",
                    })}
                    icon="plus-square-dotted"
                    toggled={showPlaceholders}
                />
                <ToolbarSeparator />
                <ToolbarButton
                    onClick={handleZoomInButton}
                    tooltip={defineMessage({ defaultMessage: "Zoom in", id: "xbi38c" })}
                    icon="zoom-in"
                />
                <ToolbarButton
                    onClick={handleZoomOutButton}
                    tooltip={defineMessage({ defaultMessage: "Zoom out", id: "/UnJ3S" })}
                    icon="zoom-out"
                />
                <ToolbarSeparator />
                <ToolbarButton
                    onClick={handleSelectToolButton}
                    tooltip={defineMessage({
                        defaultMessage:
                            "Select tool: click on an entry/node to select it. Double-click to see its neighbors.",
                        id: "5T8hcS",
                    })}
                    icon="cursor-left-fill"
                    toggled={activeTool === Tool.Select}
                />
                <ToolbarSeparator />
                <ToolbarButton
                    onClick={handleFitViewButton}
                    tooltip={defineMessage({ defaultMessage: "Fit graph to view", id: "KW0LBg" })}
                    icon="aspect-ratio"
                />
                <ToolbarButton
                    onClick={handleDownloadImageButton}
                    tooltip={defineMessage({
                        defaultMessage: "Download entire graph as an image",
                        id: "ZXv6xf",
                    })}
                    icon="image"
                />
                <ToolbarButton
                    onClick={handleCommunityButton}
                    tooltip={defineMessage({
                        defaultMessage: "Detect communities",
                        id: "MswTjB",
                    })}
                    icon="bounding-box"
                    toggled={isCommunized}
                />
            </FrameHeader>
            <FrameBody
                ref={updateGraphHolder}
                className="relative rounded-b bg-white overflow-hidden w-screen max-w-full h-screen max-h-full !p-0"
                style={activeTool === Tool.HideNodes
                    ? {
                        cursor:
                            `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z'/%3E%3C/svg%3E") 3 16, crosshair`,
                    }
                    : {}}
            >
                {/* in here is 'graphContainer', and which holds a <canvas> element. */}
            </FrameBody>
            {/* A tooltip that displays information about the currently selected entry node. */}
            <NodeTooltip
                showTooltipForNode={showTooltipForNode}
                mdtContext={mdtContext}
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
                    flex flex-col rounded border border-gray-300 w-auto h-auto
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
            <Frame className="h-auto aspect-square md:aspect-video">
                {contents}
            </Frame>
        );
    }
};

// The visual appearance for the relationships from nodes in the graph to the "placeholder" nodes that can be clicked
// on to load additional data into the graph.
const placeholderEdgeCfg = {
    style: {opacity: 0.2, lineWidth: 2,},
    labelCfg: {
        style: {
            opacity: 0.2,
            background: {
                fill: '#ffffff',
                padding: [5, 5, 5, 5],
                radius: 5,
            },
        }
    }
};

const allColors = Object.values(SDK.EntryTypeColor);

/**
 * Generate a color to use based on an integer so that "communities" 0, 1, 2, 3 etc. will each have a different color.
 */
function integerToColor(num: number) {
    return allColors[num % allColors.length];
}

/**
 * Either the data (set of nodes and relationships) or the requested transforms (manipulations of the graph) has been
 * updated. Update the actualy G6 Graph accordingly.
 */
function updateGraphData(graph: G6Graph, originalGraphData: GraphData, activeTransforms: ActiveTransforms, intl: IntlShape) {
    const hadData = graph.getNodes().length > 0;
    const existingNodeIds = new Set<string>();
    const existingRelationshipIds = new Set<string>();
    graph.getNodes().forEach((n) => existingNodeIds.add(n.getID()))
    graph.getEdges().forEach((e) => existingRelationshipIds.add(e.getID()));

    // Create a mutable copy of the graph data:
    const graphData = originalGraphData.copy();
    // Apply Optional transformers, in order:
    if (activeTransforms.removePlaceholders) RemovePlaceholdersTransformer(graphData);
    if (activeTransforms.detectCommunities) DetectCommunitiesTransformer(graphData);
    // Required transformers:
    LayoutPipelineTransformer(graphData);

    const entryTypes = graphData.getAttribute("entryTypes");
    const relationshipTypes = graphData.getAttribute("relationshipTypes");

    const convertNodeForG6 = (nodeData: NodeAttributes) => {
        if (nodeData.type === NodeType.Entry) {
            const {name: label, ...rest} = nodeData;
            return {
                label,
                ...rest,
                color: (
                    // If community detection was used, the color of the node is determined by what community it's part of:
                    rest.community !== undefined ? integerToColor(rest.community)
                    // Otherwise the color is determined by the entry type:
                    : entryTypes[nodeData.entryTypeKey]?.color
                ),
                colorCustom: entryTypes[nodeData.entryTypeKey]?.colorCustom,
                leftLetter: entryTypes[nodeData.entryTypeKey]?.abbreviation,
            };
        } else if (nodeData.type === NodeType.Placeholder) {
            const label = intl.formatMessage({defaultMessage: `{entryCount, plural, one {# entry} other {# entries}}`, id: "ImLk+z"}, {entryCount: nodeData.entryCount});
            return {label, ...nodeData};
        } else {
            throw new Error(`Unknown Node Type ${(nodeData as {type: unknown}).type}`);
        }
    };
    const convertEdgeForG6 = (edgeData: EdgeAttributes) => {
        return {
            label: relationshipTypes[edgeData.relTypeKey].name,
            ...edgeData,
            ...(edgeData.isPlaceholder ? placeholderEdgeCfg : undefined),
        };
    };

    // When nodes are added, we'll need to run the layout to re-organize them as needed (prevent overlaps, put them in
    // a logical position). Likewise, if IS A nodes in the DAGRE layout are removed, we need to redo the layout to
    // consolidate the tree (avoid awkward gaps if nodes are removed from near the middle). If nodes were only removed
    // (not added) and we only have the force layout, it wouldn't really be necessary to redo the layout, but figuring
    // that out is perhaps more trouble than its worth so we just redo the layout on any addition/removal.
    let nodesWereAddedOrRemoved = false;

    graphData.forEachNode((nodeId, attrs) => {
        const nodeModel: Partial<NodeConfig> = convertNodeForG6(attrs);
        const alreadyOnGraph = existingNodeIds.delete(nodeId);
        if (alreadyOnGraph) {
            graph.updateItem(nodeId, nodeModel);
        } else {
            nodesWereAddedOrRemoved = true;
            // We need to give the node an initial position or else there are issues with the layout animation.
            const initialPos = {x: Math.random() * 1_000 - 500, y: Math.random() * 1_000 - 500};
            if (typeof nodeModel.fromPlaceholder === "string") {
                // If we're currently replacing a placeholder with this new node(s), put them in the same position that
                // the placeholder had:
                const placeholderNode = graph.findById(nodeModel.fromPlaceholder as string)?.getModel();
                if (placeholderNode?.x && placeholderNode?.y) {
                    initialPos.x = placeholderNode.x;
                    initialPos.y = placeholderNode.y;
                }
            } else if (nodeModel.type === NodeType.Placeholder) {
                // If this is a new placeholder node, position it near the node it's connected to
                const entryNode = graph.findById(nodeModel.entryId as string)?.getModel();
                if (entryNode?.x && entryNode?.y) {
                    initialPos.x = entryNode.x;
                    initialPos.y = entryNode.y;
                }
            }
            graph.addItem('node', { id: nodeId, ...initialPos, ...nodeModel });
        }
    });

    graphData.forEachEdge((edgeId, attrs, source, target) => {
        const edgeModel: Partial<EdgeConfig> = convertEdgeForG6(attrs);
        const alreadyOnGraph = existingRelationshipIds.delete(edgeId);
        if (alreadyOnGraph) {
            graph.updateItem(edgeId, edgeModel);
        } else {
            graph.addItem('edge', { id: edgeId, source, target, ...edgeModel });
        }
    });

    // Remove any items from the graph which are no longer in the data:
    for (const removedRelId of existingRelationshipIds) {
        graph.remove(removedRelId);
    }
    for (const removedNodeId of existingNodeIds) {
        nodesWereAddedOrRemoved = true;
        graph.remove(removedNodeId);
    }

    // Placeholder nodes should always be at the back:
    graph.getNodes().forEach((node) => {
        if (node.getModel().type === NodeType.Placeholder) node.toBack();
    });

    if (!hadData) {
        debugLog("Graph data set for the first time. Will zoom to focus node after layout.");
        // After the initial layout, zoom to the "focus node":
        graph.on("afteranimate", () => {
            if (!graph || graph.destroyed) return;
            debugLog("layout done.");
            // Animation isn't needed when the graph first loads and it will interfere with our focus/zoom code below:
            // graph.stopAnimate();
            // Zoom to focus on the "focus node" after the layout, if there is one:
            const focusNode = graph.getNodes().find((node) => node.getModel().isFocusEntry);
            if (focusNode) {
                debugLog("Zooming to focus node.");
                graph.setItemState(focusNode, "selected", true);
                graph.focusItem(focusNode, false);
            }
            graph.fitView(50, undefined, true);
        }, true);
        // Before the layout starts, the nodes will be clustered at [0,0] which is now at the top left corner of the
        // canvas. Center on them so it looks less weird while we compute the layout.
        graph.zoomTo(0.5);
        graph.moveTo(0, 0, false);
        graph.layout();
    } else if (nodesWereAddedOrRemoved) {
        debugLog("running graph layout");
        graph.updateLayout();
        // After the layout is done, an animation will play to move the nodes to their final positions. Then, we need
        // to adjust the viewport:
        graph.on("afteranimate", () => {
            if (!graph || graph.destroyed) return;
            // If the newly added nodes are outside of the viewport, zoom out:
            graph.fitView(50, {onlyOutOfViewPort: true}, true);
        }, true);
    }
}
