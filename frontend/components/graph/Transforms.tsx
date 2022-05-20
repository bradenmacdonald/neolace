import { G6RawGraphData } from "components/graph/Graph";
import { VNID } from "neolace-api";
import { transformDataForGraph, transformHideNodesOfType } from "./GraphFunctions";

export interface Transform {
    id: string;
    params: Record<string, any>;
}

// NOTE assuming that transforms can only be applied once
export const transforms = {
    condense: "condense",
    hideType: "hide-type",
};

function condenseGraphData(currentData: G6RawGraphData) {
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
        if (t.id === transforms.condense) {
            transformedData = condenseGraphData(transformedData);
        } else if (t.id === transforms.hideType) {
            console.log(transformList)
            transformedData = hideNodeTypeInGraph(transformedData, t.params.nodeType);
        }
    }
    return transformedData;
}