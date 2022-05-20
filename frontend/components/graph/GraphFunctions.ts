import { MultiDirectedGraph } from 'graphology';
import { VNID } from 'neolace-api';
import type { G6RawGraphData } from './Graph'


function createGraphObject(data: G6RawGraphData): MultiDirectedGraph {
    const graph = new MultiDirectedGraph();
    
    data.nodes.forEach((n) => graph.addNode(n.id, {
        label: n.label,
        entryType: n.entryType,
    }))
    
    data.edges.forEach((e) => graph.addEdge(e.source, e.target, {
        label: e.label,
        entryType: e.entryType,
    }))

    return graph;
}

function convertGraphToData(graph: MultiDirectedGraph): G6RawGraphData {
    const data: G6RawGraphData = {
        nodes: graph.mapNodes((nodeKey) => ({ 
                id: VNID(nodeKey),
                label: graph.getNodeAttribute(nodeKey, 'label') as string, 
                entryType: VNID(graph.getNodeAttribute(nodeKey, 'entryType')),
            }
        )),
        edges: graph.mapEdges((_edge, attributes, source, target) => {
            return {
                source: source,
                target: target,
                entryType: attributes.entryType,
                label: attributes.label,
            }
        }),
    };

    return data;
}

/**
 * Returns a new graph object where leaves are consensed. i.e. if a node has
 * multiple leaves, the leaves are repalced with one leaf that contains label
 * the number of leaves they substitiuted, as an array of original leaf data
 * @param graph 
 * @returns a graph with condensed leaves.
 */
function condenseLeaves(graph:MultiDirectedGraph): MultiDirectedGraph {
    // create dictionary of nodes with entry ids as keys
    const newGraph = graph.copy();
    
    // iterate over nodes and if a node has many leaves, delete them and add a new leaf node
    const leavesToDelete = new Set<string>();
    const leafyNodes: {nodeKey: string, entryType: VNID, hiddenNodeNumber:number}[] = [];
    
    newGraph.forEachNode(nodeKey => {
        const leaves: Record<VNID, string[]> = {};

        newGraph.forEachNeighbor(nodeKey, neighborKey => {
            const neighborEntryType = graph.getNodeAttribute(neighborKey, 'entryType');
            if (newGraph.neighbors(neighborKey).length === 1) {
                if (leaves[neighborEntryType]) {
                    leaves[neighborEntryType].push(neighborKey);
                } else {
                    leaves[neighborEntryType] = [];
                    leaves[neighborEntryType].push(neighborKey);
                }              
            }
        });
        for (const [entryType, value] of Object.entries(leaves)) {
            if (value.length > 1) {
                // add leaves to nodes to delete
                value.forEach((l) => leavesToDelete.add(l));
                // add nodekey to list to create nodes
                leafyNodes.push(
                    {
                        nodeKey: nodeKey,
                        entryType: VNID(entryType),
                        hiddenNodeNumber: value.length,
                    }
                );
            }
          }
    });
    
    // delete leaves
    leavesToDelete.forEach((leafKey) => {
        newGraph.dropNode(leafKey);
    })
    // create leaves
    leafyNodes.forEach((leafyNode) => {
        const newLeafKey = VNID();
        newGraph.addNode(newLeafKey, {
            label: `${leafyNode.hiddenNodeNumber} entries condensed`, 
            entryType: leafyNode.entryType,
        });
        newGraph.addEdge(leafyNode.nodeKey, newLeafKey);
    })

    return newGraph;
}


/**
 * Condense the simplest but often fairly prominant pattern:
*
*{Node of type A} - {Node of Type B} - {Node of Type A}
*                - {Node of Type B} -
*                - {Node of Type B} -
*                - {Node of Type B} -
*
* Results in:
* {Node of type A} - {Node of Type B saying "4 nodes condensed"} - {Node of Type A}
 * 
 * @param graph a Graph object representing the graph data
 * @param relativeEType The entry type of the nodes relative to which to perform the condensing operation.
 * @returns a new condensed graph
 */
function condenseSimplePattern(graph: MultiDirectedGraph, relativeEType: VNID): MultiDirectedGraph {
    // delete these nodes and save only one condensed node
    
    // create dictionary of nodes with entry ids as keys
    const newGraph = graph.copy();
    
    // iterate over nodes
    const nodesToDelete = new Set<string>();
    const nodePairs: {nodeKey: string, endNodeKey: string, middleNodeEType: VNID, hiddenNodeNumber:number}[] = [];
    
    newGraph.forEachNode(nodeKey => {
        if (graph.getNodeAttribute(nodeKey, 'entryType') === relativeEType) {
            // divide neighbours by type
            const nTripletsByType: Record<VNID, Record<string, string[]>> = {};
            
            // filter neighbours to have only one other connection to a node of the same type as this node
            newGraph.forEachNeighbor(nodeKey, neighborKey => {
                const neighborEntryType = graph.getNodeAttribute(neighborKey, 'entryType');
                const nNeighbours = newGraph.neighbors(neighborKey);
                if (nNeighbours.length === 2) {
                    const eType1 = graph.getNodeAttribute(nNeighbours[0], 'entryType');
                    const eType2 = graph.getNodeAttribute(nNeighbours[1], 'entryType');
                    const endNodeKey = nNeighbours[0] === nodeKey ? nNeighbours[1] : nNeighbours[0];
                    
                    if (eType1 === eType2) {
                        if (!nTripletsByType[neighborEntryType]) {
                            nTripletsByType[neighborEntryType] = {}
                        }
                        if (nTripletsByType[neighborEntryType][endNodeKey]) {
                            nTripletsByType[neighborEntryType][endNodeKey].push(neighborKey);
                        } else {
                            nTripletsByType[neighborEntryType][endNodeKey] = [];
                            nTripletsByType[neighborEntryType][endNodeKey].push(neighborKey);
                        }
                            
                    }
    
                }
            });
            for (const [entryType, value] of Object.entries(nTripletsByType)) {
                for (const [endNode, nodeList] of Object.entries(value)) {
                    if (nodeList.length > 1) {
                        // add leaves to nodes to delete
                        nodeList.forEach((l) => nodesToDelete.add(l));
                        // add nodekey to list to create nodes
                        nodePairs.push(
                            {
                                nodeKey: nodeKey,
                                endNodeKey: endNode,
                                middleNodeEType: VNID(entryType),
                                hiddenNodeNumber: nodeList.length,
                            }
                        );
                    }
                }
            }
        }
    });
    
    // delete middle nodes
    nodesToDelete.forEach((middleNodeKey) => {
        newGraph.dropNode(middleNodeKey);
    })
    // create condensed middle nodes
    const pairs: string[][] = [];

    nodePairs.forEach((pair) => {
        const thisPair = [pair.endNodeKey, pair.nodeKey];

        let pairExists = false;
        pairs.forEach((p) => {
            if (p[0] === thisPair[0]) {
                if (p[1] === thisPair[1]) {
                    pairExists = true;
                }
            } else if (p[0] === thisPair[1]) {
                if (p[1] === thisPair[0]) {
                    pairExists = true;
                }
            }
        })

        if (!pairExists) {
            pairs.push(thisPair);
            const newLeafKey = VNID();
            newGraph.addNode(newLeafKey, {
                label: `${pair.hiddenNodeNumber} entries condensed`, 
                entryType: pair.middleNodeEType,
            });
            newGraph.addEdge(pair.nodeKey, newLeafKey);
            newGraph.addEdge(pair.endNodeKey, newLeafKey);
        }
    })

    return newGraph;
}


// for now just find all the leaf nodes and for every node that has more than one leaf node:
// remove the leaf nodes, create one leaf node with label saying how many leaf nodes there are.
export function transformDataForGraph(data: G6RawGraphData, entryType: VNID) {
    const graph = createGraphObject(data);
    const transformedGraph = condenseLeaves(graph);
    const condensedGraph = condenseSimplePattern(transformedGraph, entryType);
    return convertGraphToData(condensedGraph);
}