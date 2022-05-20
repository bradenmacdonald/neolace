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
    const focusNode = currentData.nodes.find((n) => n.isFocusEntry) ?? currentData.nodes[0];
    if (focusNode === undefined) {
        return currentData;  // Error - there are no nodes at all.
    }
    const condensedData = transformDataForGraph(currentData, focusNode.entryType);
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