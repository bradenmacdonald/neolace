/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import { api } from "lib/api-client";
import { MDTContext } from "./markdown-mdt/mdt";
import G6, { Graph, GraphOptions, IG6GraphEvent, INode, NodeConfig } from "@antv/g6";
import { useResizeObserver } from "./utils/resizeObserverHook";
import { GraphTooltip } from "./GraphTooltip";

interface GraphProps {
    value: api.GraphValue;
    mdtContext: MDTContext;
    children?: never;
}

const listOfColours = [
    "red",
    "pink",
    "skyblue",
    "orange",
    "green",
    "violet",
    "lightgreen",
    "lightblue",
];

const colour_dict = new Map();
const globalFontSize = 12;
const maxNodeSize = 130;
const maxEdgeSize = 120;

function convertValueToData(value: api.GraphValue, refCache: api.ReferenceCacheData) {
    const data = {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: truncateString(n.name, maxNodeSize, globalFontSize), entryType: n.entryType }
        )),
        edges: value.rels.map((e) => (
            {
                source: e.fromEntryId,
                target: e.toEntryId,
                entryType: e.relType,
                label: truncateString(refCache.properties[e.relType]?.name ?? e.relType, maxEdgeSize, globalFontSize),
            }
        )),
    };

    data.nodes.forEach((node: NodeConfig) => {
        if (!colour_dict.has(node.entryType)) {
            colour_dict.set(node.entryType, listOfColours.pop());
        }
        const colour = colour_dict.get(node.entryType);

        node.style = {
            // The style for the keyShape
            fill: colour,
            stroke: "#888",
            lineWidth: 2,
        };
    });

    return data;
}

function refreshDragedNodePosition(e: IG6GraphEvent) {
    const model = e.item!.get("model");
    model.fx = e.x;
    model.fy = e.y;
}

/**
 * format the string
 * @param {string} str The origin string
 * @param {number} maxWidth max width
 * @param {number} fontSize font size
 * @return {string} the processed result
 */
const truncateString = (str: string, maxWidth: number, fontSize: number) => {
    const ellipsis = "...";
    const ellipsisLength = G6.Util.getTextSize(ellipsis, fontSize)[0];
    let currentWidth = 0;
    let res = str;
    const pattern = new RegExp("[\u4E00-\u9FA5]+"); // distinguish the Chinese charactors and letters
    str.split("").forEach((letter, i) => {
        if (currentWidth > maxWidth - ellipsisLength) return;
        if (pattern.test(letter)) {
            // Chinese charactors
            currentWidth += fontSize;
        } else {
            // get the width of single letter according to the fontSize
            currentWidth += G6.Util.getLetterWidth(letter, fontSize);
        }
        if (currentWidth > maxWidth - ellipsisLength) {
            res = `${str.substr(0, i)}${ellipsis}`;
        }
    });
    return res;
};

/**
 * Display a graph visualization.
 */
export const LookupGraph: React.FunctionComponent<GraphProps> = (props) => {
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
            type: "modelRect",
            size: [200, 50],
            // The configuration of the logo icon in the node
            logoIcon: {
                // Whether to show the icon. false means hide the icon
                show: false,
                x: 0,
                y: 0,
                // the image url of icon
                img: "https://gw.alipayobjects.com/zos/basement_prod/4f81893c-1806-4de4-aff3-9a6b266bc8a2.svg",
                width: 16,
                height: 16,
                // Adjust the left/right offset of the icon
                offset: 0,
            },
            // The configuration of the state icon in the node
            stateIcon: {
                // Whether to show the icon. false means hide the icon
                show: false,
                x: 0,
                y: 0,
                // the image url of icon
                img: "https://gw.alipayobjects.com/zos/basement_prod/300a2523-67e0-4cbf-9d4a-67c077b40395.svg",
                width: 16,
                height: 16,
                // Adjust the left/right offset of the icon
                offset: -5,
            },
            preRect: {},
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
        nodeStateStyles: {
            selected: {
                stroke: '#f00',
                lineWidth: 3
            },
            highlight: {
                stroke: 'blue',
                lineWidth: 2,
            },
            disabled: {
                opacity: 0.5,
            }
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
        if (!ref.current) {
            return;  // We can't (re-)initialize the graph yet, because we don't have a valid reference to the <div> that will hold it.
        }
        const container = ref.current;
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
        graph.on("node:dblclick", function (e) {
            const item = e.item as INode;
            const this_hull_id = `hull-${item.getID()}`;
            const hulls = graph.getHulls();

            let hull_exist = false;

            if (!hulls) {
                hull_exist = false;
            } else {
                Object.entries(hulls).forEach(([hull_id, hull_value]) => {
                    if (hull_id === this_hull_id ) {
                        hull_exist = true;
                    }
                })
            }

            if (!hull_exist) {
                console.log('Hull created')
                graph.createHull({
                    id: `hull-${item.getID()}`,
                    type: 'bubble',
                    members: [...item.getNeighbors(), item],
                    padding: 30,
                })
            }
        })

        graph.on('afterlayout', () => {
            let timer: ReturnType<typeof setTimeout>|null;
            graph.on('afterupdateitem', (e) => {
                const hulls = graph.getHulls();
                if (!hulls) return;
                if (timer) {
                    // We have already scheduled a call to hull.updateData(). Don't call it again or it can cause
                    // performance problems and freezes.
                    return;
                }
                timer = setTimeout(() => {
                    Object.values(hulls).forEach((hull) => {
                        hull.updateData(hull.members, hull.nonMembers);
                    });
                    timer = null;
                }, 50);
            })
        });
        //  when a node is selected, show the neighbouring nodes and connecting edges as selected.
        // NOTE the built in node and edge states are: active, inactive, selected, highlight, disable
        // styles for the states can be configured.
        graph.on("node:click", function (e) {
            graph.getEdges().forEach((edge) => {
                graph.clearItemStates(edge);
            });
            graph.getNodes().forEach((node) => {
                graph.clearItemStates(node);
            });
            // graph.layout();
            const item = e.item as INode;
            // if it is this node or connected node, then highlight
            graph.getNodes().forEach((node) => {
                if (node === item) {
                    graph.setItemState(item, 'selected', true);
                } else if (item.getNeighbors().includes(node)) {
                    graph.setItemState(node, 'highlight', true);
                } else {
                    graph.setItemState(node, 'disabled', true);
                }
            })
            
            // if it is a connected adge, then highlight
            console.log('Begin')
            // BUG sometimes when click on the node it does not highlight all of them
            // even though it does check the if statement correctly
            graph.getEdges().forEach((edge) => {
                if (
                    ((edge.getSource().getID()  === item.getID()) ||
                    (edge.getTarget().getID()  === item.getID()))
                ){
                    graph.setItemState(edge, 'selected', true);
                    graph.setItemState(edge, 'disabled', false);
                    console.log('I am here')
                  } else {
                    graph.setItemState(edge, 'disabled', true);
                    graph.setItemState(edge, 'selected', false);
                }
            })

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

    return (
        <>
            <div ref={ref} className="w-full aspect-square md:aspect-video border-2 border-gray-200 overflow-hidden">
            </div>
        </>
    );
};
