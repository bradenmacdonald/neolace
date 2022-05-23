import { G6RawGraphData } from "components/graph/Graph";
import { VNID } from "neolace-api";
import { transformDataForGraph, transformHideNodesOfType } from "./GraphFunctions";

export interface Transform {
    id: string;
    params: Record<string, unknown>;
}

// NOTE assuming that transforms can only be applied once
export enum Transforms {
    CONDENSE =  "condense",
    HIDETYPE = "hide-type",
}

function condenseGraphData(currentData: G6RawGraphData) {
    // NOTE for now, we are performing node condensing relative to the "this" node of the graph.
    // NOTE: the 'this' node is only indicated by being first in the index of nodes
    const condensedData = transformDataForGraph(currentData, currentData.nodes[0].entryType);
    return condensedData;
}

function hideNodeTypeInGraph(currentData: G6RawGraphData, param: string) {
    const prunedData = transformHideNodesOfType(
            currentData, 
            VNID(param)
        );
    return prunedData;
}

export function applyTransforms(data: G6RawGraphData, transformList: Transform[]) {
    let transformedData = {
        nodes: [... data.nodes],
        edges: [... data.edges],
    };

    for (const t of transformList) {
        if (t.id === Transforms.CONDENSE) {
            transformedData = condenseGraphData(transformedData);
        } else if (t.id === Transforms.HIDETYPE) {
            console.log(transformList)
            transformedData = hideNodeTypeInGraph(transformedData, t.params.nodeType as string);
        }
    }
    return transformedData;
}