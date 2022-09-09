import { G6RawGraphData } from "components/graph/Graph";
import { VNID } from "neolace-api";
import {
    convertGraphToData,
    createGraphObject,
    GraphType,
    transformComputeCliques,
    transformComputeCommunities,
    transformCondenseGraph,
    transformCondenseNodeLeaves,
    transformExpandLeaves,
    transformHideNodesOfType,
} from "./graph-functions";

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
        return graph; // Error - there are no nodes at all.
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
            // TODO Ideally, we shouldn't need to pass dataCopy into this function, or even make dataCopy at all.
            // condenseGraphData seems to only be using it to figure out which node is the "focus node",
            // and that attribute should be available on the graphology graph object just as it's available in the G6 data.
            transformedGraph = condenseGraphData(dataCopy, transformedGraph);
        } else if (t.id === Transforms.HIDETYPE) {
            transformedGraph = transformHideNodesOfType(transformedGraph, VNID(t.params.nodeType as string));
        } else if (t.id === Transforms.EXPANDLEAF) {
            transformedGraph = transformExpandLeaves(
                originalDataGraph,
                transformedGraph,
                t.params.parentKey as string[],
                t.params.entryType as string,
            );
        } else if (t.id === Transforms.CONDENSENODE) {
            transformedGraph = transformCondenseNodeLeaves(transformedGraph, t.params.nodeToCondense as string);
        } else if (t.id === Transforms.COMMUNITY) {
            // TODO: if there are certain constraints on the order of transforms, they should be maintained in the
            // transform list itself. For example, that cliques must come after communities, and communities must come
            // after other things. Mya also sort the list in a separate function.
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
