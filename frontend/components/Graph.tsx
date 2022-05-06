/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from 'react';
import { api } from 'lib/api-client';
import { MDTContext } from './markdown-mdt/mdt';
import G6, { Graph } from '@antv/g6';
import ReactDOM from 'react-dom';

interface GraphProps {
    value: api.GraphValue;
    mdtContext: MDTContext;
    children?: never;
}

function convertValueToDate(value: api.GraphValue) {
    return {
        nodes: value.entries.map((n) => (
            { id: n.entryId, label: n.name }
        )),
        edges: value.rels.map((e) => (
            { source: e.fromEntryId, target: e.toEntryId }
        )),
    }
}

/**
 * Display a graph visualization.
 */
export const LookupGraph: React.FunctionComponent<GraphProps> = (props) => {
    const data = React.useMemo(() => {
        return convertValueToDate(props.value);
    }, [props.value])

    const ref = React.useRef<HTMLDivElement>(null);
    const [graph, setGraph] = React.useState<Graph | null>(null);

    React.useEffect(() => {
        if (!graph && ref.current) {
            console.log("Here")
            const newGraph = new G6.Graph({
                container: ref.current,
                width: 1200,
                height: 2000,
                modes: {
                    default: ['drag-canvas'],
                },
                layout: {
                    type: 'dagre',
                    direction: 'LR',
                },
                defaultNode: {
                    type: 'node',
                    labelCfg: {
                        style: {
                            fill: '#000000A6',
                            fontSize: 10,
                        },
                    },
                    style: {
                        stroke: '#72CC4A',
                        width: 150,
                    },
                },
                defaultEdge: {
                    type: 'polyline',
                },
            });
            newGraph.data(data);
            newGraph.render();
            setGraph(newGraph);
        }
    }, [ref.current]);

    return <div ref={ref}></div>;
};  
