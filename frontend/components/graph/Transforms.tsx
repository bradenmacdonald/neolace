import { G6RawGraphData } from "components/graph/Graph";
import { VNID } from "neolace-api";
import {
    transformCondenseGraph,
    transformHideNodesOfType,
    transformExpandLeaves,
    createGraphObject,
    convertGraphToData,
    GraphType,
    transformCondenseNodeLeaves,
    transformComputeCommunities,
    transformComputeCliques
} from "./GraphFunctions";

export interface Transform {
    id: string;
    params: Record<string, unknown>;
}

// NOTE assuming that transforms can only be applied once
export enum Transforms {
    CONDENSE = "condense",
    HIDETYPE = "hide-type",
    EXPANDLEAF = "expand-leaf",
    COMMUNITY = "community",
    CONDENSENODE = "condense-node",
    ADDCLIQUES = "add-cliques",
}

function condenseGraphData(currentData: G6RawGraphData, graph: GraphType) {
    // NOTE for now, we are performing node condensing relative to the "this" node of the graph.
    const focusNode = currentData.nodes.find((n) => n.isFocusEntry) ?? currentData.nodes[0];
    if (focusNode === undefined) {
        return graph;  // Error - there are no nodes at all.
    }
    const condensedGraph = transformCondenseGraph(graph, focusNode.entryType);
    return condensedGraph;
}


export function applyTransforms(data: G6RawGraphData, transformList: Transform[]): Readonly<G6RawGraphData> {
    const dataCopy = JSON.parse(JSON.stringify(data));
    const originalDataGraph = createGraphObject(dataCopy);
    let transformedGraph = createGraphObject(dataCopy);
    let comm2id = new Map<number, string[]>();

    for (const t of transformList) {
        if (t.id === Transforms.CONDENSE) {
            transformedGraph = condenseGraphData(dataCopy, transformedGraph);
        } else if (t.id === Transforms.HIDETYPE) {
            transformedGraph = transformHideNodesOfType(transformedGraph, VNID(t.params.nodeType as string));
        } else if (t.id === Transforms.EXPANDLEAF) {
            transformedGraph = transformExpandLeaves(
                originalDataGraph,
                transformedGraph,
                t.params.parentKey as string[],
                t.params.entryType as string
            );
        } else if (t.id === Transforms.CONDENSENODE) {
            transformedGraph = transformCondenseNodeLeaves(transformedGraph, t.params.nodeToCondense as string);
        } else if (t.id === Transforms.COMMUNITY) {
            // compute communities needs to be last transform to be applied as all final nodes are needed.
            const result = transformComputeCommunities(transformedGraph);
            transformedGraph = result.simpleGraph;
            comm2id = result.comm2id;
        } else if (t.id === Transforms.ADDCLIQUES) {
            // if no community transform -> find cliques transform is not done.
            if (transformList.find((t) => t.id === Transforms.COMMUNITY) === undefined) continue;
            transformedGraph = transformComputeCliques(transformedGraph, comm2id);
        }
    }
    const finalData = convertGraphToData(transformedGraph);
    return finalData;
}