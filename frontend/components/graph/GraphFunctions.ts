import { Edge } from '@antv/g6';
import Graph from 'graphology';
import { VNID } from 'neolace-api';
import { G6RawGraphData } from '../Graph'



function createGraphObject(data: G6RawGraphData): Graph {
    const graph = new Graph();
    
    data.nodes.forEach((n) => graph.addNode(n.id, {
        label: n.label,
        entryType: n.entryType,
    }))
    
    data.edges.forEach((e) => {
        graph.addEdge(e.source, e.target, {
            label: e.label,
            entryType: e.entryType,
        })
    })
    
    return graph;
}

function convertGraphToData(graph: Graph): G6RawGraphData {
    const data: G6RawGraphData = {
        nodes: graph.mapNodes((nodeKey) => ({ 
            id: VNID(nodeKey),
            label: graph.getNodeAttribute(nodeKey, 'label') as string, 
            entryType: VNID(graph.getNodeAttribute(nodeKey, 'entryType')),
        }
        )),
        edges: graph.mapEdges((edge, attributes, source, target) => {
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
function condenseLeaves(graph:Graph): Graph {
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
        // BUG sometimes this shows that edge already exists when I only have person nodes and try to condense.

        if (newGraph.hasEdge(leafyNode.nodeKey, newLeafKey)) {
            console.log('edge already exists');
        } else {
            newGraph.addEdge(leafyNode.nodeKey, newLeafKey);
        }
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
function condenseSimplePattern(graph: Graph, relativeEType: VNID): Graph {
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

            if (newGraph.hasEdge(pair.nodeKey, newLeafKey)) {
                console.log('edge already exists');
            } else {
                newGraph.addEdge(pair.nodeKey, newLeafKey);
            }

            if (newGraph.hasEdge(pair.endNodeKey, newLeafKey)) {
                console.log('edge already exists');
            } else {
                newGraph.addEdge(pair.endNodeKey, newLeafKey);
            }
        }
    })

    return newGraph;
}

/*
Hide nodes of given entry type as follows: for each deleted node, take all of its neighbours, and connect all of them
with undirected relationsips.
*/
export function hideNodesOfType(graph: Graph, eTypeToRemove: VNID): Graph {
    // filter nodes to only of the removed type
    const newGraph = graph.copy();
    const nodesToRemove = newGraph.filterNodes((n, attr) => {
        return attr.entryType === eTypeToRemove;
    })

    // iterate over the nodes
    nodesToRemove.forEach((n) => {
        let neighbors: string[] = [];
        newGraph.forEachNeighbor(n, (neihgborKey) => {
            neighbors.push(neihgborKey);
        })

        // keep only those neighbors that are not targeted for deletion
        neighbors = neighbors.filter((n) => {
            return !nodesToRemove.includes(n);
        })

        // delete the node
        newGraph.dropNode(n);

        neighbors.forEach((neighbor) => {
            // add undirected edges between naighbours
            neighbors.forEach((nb) => {
                // do not create self loops
                if (nb !== neighbor) {
                    if (!newGraph.hasEdge(neighbor, nb) && !newGraph.hasEdge(nb, neighbor)) {
                        newGraph.addDirectedEdge(
                            neighbor,
                            nb
                        )
                    }
                }
            })
        })
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

export function transformHideNodesOfType(data: G6RawGraphData, nType: VNID) {
    const graph = createGraphObject(data);
    const transformedGraph = hideNodesOfType(graph, nType);
    const transformedData = convertGraphToData(transformedGraph);
    return transformedData;
}