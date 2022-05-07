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
]

const colour_dict = new Map()


function convertValueToData(value: api.GraphValue) {
    const data = {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: n.name , entryType: n.entryType}
        )),
        edges: value.rels.map((e) => (
            { source: e.fromEntryId, target: e.toEntryId, entryType: e.relType }
        )),
    }

    data.nodes.forEach((node: NodeConfig) => {
        node.type = 'rect';

        if (!colour_dict.has(node.entryType)) {
            colour_dict.set(node.entryType, listOfColours.pop());
        }
        const colour =  colour_dict.get(node.entryType);

        node.style = {
            // The style for the keyShape
            fill: colour,
            stroke: '#888',
            lineWidth: 1,
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
        return convertValueToData(props.value);
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
                    type: 'force',
                },
                defaultNode: {
                    size: 15,
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
