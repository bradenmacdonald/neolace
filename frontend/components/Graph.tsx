/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import { api } from "lib/api-client";
import { MDTContext } from "./markdown-mdt/mdt";
import G6, { Graph, GraphOptions, IG6GraphEvent, INode, NodeConfig } from "@antv/g6";
import { useResizeObserver } from "./utils/resizeObserverHook";
import { GraphTooltip } from "./GraphTooltip";
import { EntryColor, entryNode, pickEntryTypeLetter } from "./graph/Node";
import { VNID } from "neolace-api";
import { ToolbarButton } from "./widgets/Button";
import { useIntl } from "react-intl";
import { Modal } from "./widgets/Modal";

interface GraphProps {
    value: api.GraphValue;
    mdtContext: MDTContext;
    children?: never;
}

let nextColor = 0;
const colourMap = new Map<VNID, EntryColor>();

function convertValueToData(value: api.GraphValue, refCache: api.ReferenceCacheData) {
    const data = {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: n.name, entryType: n.entryType }
        )),
        edges: value.rels.map((e) => (
            {
                source: e.fromEntryId,
                target: e.toEntryId,
                entryType: e.relType,
                label: refCache.properties[e.relType]?.name ?? e.relType,
            }
        )),
    };

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

function refreshDragedNodePosition(e: IG6GraphEvent) {
    const model = e.item!.get("model");
    model.fx = e.x;
    model.fy = e.y;
}

/**
 * Display a graph visualization.
 */
export const LookupGraph: React.FunctionComponent<GraphProps> = (props) => {
    const intl = useIntl();
    const data = React.useMemo(() => {
        return convertValueToData(props.value, props.mdtContext.refCache);
    }, [props.value]);

    const ref = React.useRef<HTMLDivElement>(null);
    const [graph, setGraph] = React.useState<Graph | null>(null);

    // Create a reference (an object that holds mdtContext) that we can pass to the tooltip,
    // so that the tooltip can always access the mdtContext and we don't have to re-create the
    // tooltip plugin whenever the mdtContext changes.
    const mdtContextRef = React.useRef<MDTContext>(props.mdtContext);
    React.useEffect(() => { mdtContextRef.current = props.mdtContext; }, [props.mdtContext]);

    // Construct the tooltip plugin.
    const tooltip = React.useMemo(() =>
        new GraphTooltip(mdtContextRef), []
    );
    // Our graph configuration
    const graphConfig: Partial<GraphOptions> = React.useMemo(() => ({
        plugins: [tooltip],
        layout: {
            type: 'force',
            preventOverlap: true,
            nodeSize: [200, 50],
            nodeSpacing: 60,
            alphaMin: 0.2,
            // clustering: true,

            // type: "dagre",
            // rankdir: "TB", // The center of the graph by default
            // align: "DL",
            // nodesep: 50,
            // ranksep: 100,
            // controlPoints: true,

            // type: 'radial',
            // unitRadius: 1000,
            // preventOverlap: true,
            // nodeSize: 200,
            // nodeSpacing: 4000,
            // linkDistance: 400,
            // sortBy: 'comboId',
            // sortStrength: 100,

            // type: 'comboCombined',
            // nodeSize: 200,
            // outerLayout: new G6.Layout['gForce']({
            //     linkDistance: 2500,
            // }),
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
    }), [tooltip]);

    // Initialize the G6 graph, once we're ready
    React.useEffect(() => {
        console.log("About to initialize.");
        if (!ref.current) {
            return;  // We can't (re-)initialize the graph yet, 
            // because we don't have a valid reference to the <div> that will hold it.
        }
        const container = ref.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        const newGraph = new G6.Graph({ container, width, height, ...graphConfig });
        console.log('Initialized.');
        setGraph((oldGraph) => {
            if (oldGraph) {
                // If there already was a graph, destroy it because we're about to re-create it.
                oldGraph.destroy();
            }
            return newGraph;
        });
    }, [ref, graphConfig]);

    // Set the graph data and render it whenever the data has changed or the graph has been re-initialized:
    React.useEffect(() => {
        if (!graph || graph.destroyed) { return; }
        graph.data(data);
        graph.render();
    }, [graph, data]);

    // Set up G6 event handlers whenever the graph has been initialized for the first time or re-initialized
    React.useEffect(() => {
        if (!graph || graph.destroyed) { return; }

        // create a hull of immideately connected nodes upon double clicking on the node
        

        //  when a node is selected, show the neighbouring nodes and connecting edges as selected.
        // NOTE the built in node and edge states are: active, inactive, selected, highlight, disable
        // styles for the states can be configured.
        graph.on("node:click", function (e) {
            const item = e.item as INode;
            // if it is this node or connected node, then highlight
            graph.getNodes().forEach((node) => {
                if (node === item) {
                    graph.setItemState(node, 'disabled', false);
                    graph.setItemState(node, 'selected', true);
                    console.log('selected node')
                } else if (item.getNeighbors().includes(node)) {
                    graph.setItemState(node, 'disabled', false);
                    graph.setItemState(node, 'selected', true);
                } else {
                    graph.setItemState(node, 'disabled', true);
                }
            })

            // if it is a connected adge, then highlight
            console.log('Begin')
            // even though it does check the if statement correctly
            graph.getEdges().forEach((edge) => {
                if (
                    ((edge.getSource().getID() === item.getID()) ||
                        (edge.getTarget().getID() === item.getID()))
                ) {
                    graph.setItemState(edge, 'selected', true);
                    graph.setItemState(edge, 'disabled', false);
                    console.log('I am here')
                } else {
                    graph.setItemState(edge, 'disabled', true);
                    graph.setItemState(edge, 'selected', false);
                }
            })


        });

        graph.on("nodeselectchange" as any, (e) => { // the type says it's not allowed but it works
            // The current manipulated item
            console.log(e.target);
            // The set of selected items after this operation
            console.log(e.selectedItems);
            // A boolean tag to distinguish if the current operation is select(`true`) or deselect (`false`)
            console.log(e.select);
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
        ref.current?.addEventListener("MozMousePixelScroll", (e) => {
            e.preventDefault();
        }, { passive: false });
    }, [ref.current]);

    // Automatically resize the graph if the containing element changes size.
    const handleSizeChange = React.useCallback(() => {
        if (!graph || graph.destroyed || !ref.current) return;
        const width = ref.current.clientWidth, height = ref.current.clientHeight;
        if (graph.getWidth() !== width || graph.getHeight() !== height) {
            graph.changeSize(width, height);
            graph.layout();
            graph.fitView();
        }
    }, [graph]);
    useResizeObserver(ref, handleSizeChange);

    const [expanded, setExpanded] = React.useState(false);
    const expandGraphCanvas = React.useCallback(() => {
        setExpanded((wasExpanded) => !wasExpanded);
    }, []);
            
    const graphDiv = <>
        <div ref={ref} className="w-full relative aspect-square md:aspect-video border-2 border-gray-200 overflow-hidden">
        </div>
        <div className="block w-full border-b-[1px] border-gray-500 bg-gray-100 p-1">
            <ToolbarButton
                onClick={expandGraphCanvas}
                title={intl.formatMessage({id: "ui.component.mdtEditor.toolbar.sourceMode", defaultMessage: "Edit source"})}
                icon="plus"
            />
        </div>
    </>

    if (expanded) {
        return (
            <Modal>
                {graphDiv}
            </Modal>
        );
    } else {
        return (
                graphDiv
        );
    }

};
