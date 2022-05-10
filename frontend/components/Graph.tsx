/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from 'react';
import { api } from 'lib/api-client';
import { MDTContext } from './markdown-mdt/mdt';
import G6, { Graph, IG6GraphEvent, NodeConfig } from '@antv/g6';
import { useResizeObserver } from './utils/resizeObserverHook';

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
]

const colour_dict = new Map()


function convertValueToData(value: api.GraphValue, refCache: api.ReferenceCacheData) {
    const data = {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: n.name , entryType: n.entryType}
        )),
        edges: value.rels.map((e) => (
            { source: e.fromEntryId, target: e.toEntryId, entryType: e.relType , label: refCache.properties[e.relType]?.name ?? e.relType }
        )),
    }

    data.nodes.forEach((node: NodeConfig) => {
        if (!colour_dict.has(node.entryType)) {
            colour_dict.set(node.entryType, listOfColours.pop());
        }
        const colour =  colour_dict.get(node.entryType);

        node.style = {
            // The style for the keyShape
            fill: colour,
            stroke: '#888',
            lineWidth: 2,
        };
    })

    return data;
}

function refreshDragedNodePosition(e: IG6GraphEvent) {
    const model = e.item!.get('model');
    model.fx = e.x;
    model.fy = e.y;
}

/**
 * Display a graph visualization.
 */
export const LookupGraph: React.FunctionComponent<GraphProps> = (props) => {
    const data = React.useMemo(() => {
        return convertValueToData(props.value, props.mdtContext.refCache);
    }, [props.value])

    const ref = React.useRef<HTMLDivElement>(null);
    const [graph, setGraph] = React.useState<Graph | null>(null);


    React.useEffect(() => {
        if (!graph && ref.current) {
            const container = ref.current;
            const width = container.clientWidth;
            const height = container.clientHeight;
            const newGraph = new G6.Graph({
                container,
                width,
                height,
                layout: {
                    type: 'dagre',
                    rankdir: 'RL', // The center of the graph by default
                    align: 'DL',
                    nodesep: 50,
                    ranksep: 100,
                    controlPoints: true,
                },
                defaultNode: {
                    type: 'modelRect',
                        // The configuration of the logo icon in the node
                    logoIcon: {
                        // Whether to show the icon. false means hide the icon
                        show: false,
                        x: 0,
                        y: 0,
                        // the image url of icon
                        img: 'https://gw.alipayobjects.com/zos/basement_prod/4f81893c-1806-4de4-aff3-9a6b266bc8a2.svg',
                        width: 16,
                        height: 16,
                        // Adjust the left/right offset of the icon
                        offset: 0
                    },
                    // The configuration of the state icon in the node
                    stateIcon: {
                        // Whether to show the icon. false means hide the icon
                        show: false,
                        x: 0,
                        y: 0,
                        // the image url of icon
                        img: 'https://gw.alipayobjects.com/zos/basement_prod/300a2523-67e0-4cbf-9d4a-67c077b40395.svg',
                        width: 16,
                        height: 16,
                        // Adjust the left/right offset of the icon
                        offset: -5
                    },
                    preRect: {

                    }
                },
                defaultEdge: {
                    type: 'polyline',
                    /* configure the bending radius and min distance to the end nodes */
                    style: {
                      radius: 10,
                      offset: 30,
                      endArrow: {
                        path: G6.Arrow.triangle(10, 20, 0),
                        d: 0,
                        fill: 'black',
                        },
                      lineWidth: 3,
                      /* and other styles */
                      // stroke: '#F6BD16',
                    },
                },
                modes: {
                    default: ['drag-canvas', 'click-select', 'zoom-canvas'],
                },
            });
            newGraph.data(data);
            newGraph.render();
            setGraph(newGraph);

            newGraph.on('node:dragstart', function (e) {
                newGraph.layout();
                refreshDragedNodePosition(e);
            });
            newGraph.on('node:drag', function (e) {
                const forceLayout = newGraph.get('layoutController').layoutMethods[0];
                forceLayout.execute();
                refreshDragedNodePosition(e);
            });
            newGraph.on('node:dragend', function (e) {
                if (!e.item) {
                    return;
                }
                e.item.get('model').fx = null;
                e.item.get('model').fy = null;
            });

            // Fix bug that occurs in Firefox only: scrolling the mouse wheel on the graph also scrolls the page.
            ref.current.addEventListener("MozMousePixelScroll", (e) => { e.preventDefault(); }, {passive: false })
        }
    }, [ref.current]);

    // Automatically resize the graph if the containing element changes size.
    const handleSizeChange = React.useCallback(() => {
        if (!graph || graph.destroyed) { return; }
        const width = ref.current!.clientWidth, height = ref.current!.clientHeight;
        if (graph.getWidth() !== width || graph.getHeight() !== height) {
            graph.changeSize(width, height);
            graph.layout();
            graph.fitView();
        }
    }, [graph]);
    useResizeObserver(ref, handleSizeChange);

    return <div ref={ref} className="w-full aspect-square md:aspect-video border-2 border-gray-200 overflow-hidden"></div>;
};  
