import Graph from 'graphology';
import { VNID } from 'neolace-api';
import type { G6RawGraphData } from './Graph'

interface NodeAttributes {
    label: string;
    entryType: VNID;
    isFocusEntry?: boolean;
    leavesCondensed?: Set<string>;
}
interface EdgeAttributes {
    label: string;
    relId: VNID;
    relType: VNID;
}
export type GraphType = Graph<NodeAttributes, EdgeAttributes>;



export function createGraphObject(data: G6RawGraphData): GraphType {
    const graph = new Graph<NodeAttributes, EdgeAttributes>();
    
    data.nodes.forEach((n) => {
        const  {id: id, ...nodeAttributes } = n;
        graph.addNode(id, nodeAttributes);
    })
    
    data.edges.forEach((e) => {
        const {source, target, id:relId,  ...edgeAttributes} = e;
        graph.addEdge(source, target, {relId, ...edgeAttributes});
    })   
    return graph;
}

export function convertGraphToData(graph: GraphType): G6RawGraphData {
    const data: G6RawGraphData = {
        nodes: graph.mapNodes((nodeKey) => ({ 
            id: VNID(nodeKey),
            label: graph.getNodeAttribute(nodeKey, 'label') as string, 
            entryType: VNID(graph.getNodeAttribute(nodeKey, 'entryType')),
            ...(graph.hasNodeAttribute(nodeKey, 'isFocusEntry') && {isFocusEntry: true}),
            ...(graph.hasNodeAttribute(nodeKey, 'leavesCondensed') 
                && {leavesCondensed: graph.getNodeAttribute(nodeKey, 'leavesCondensed')}),

        })),
        edges: graph.mapEdges((edge, attributes, source, target) => {
            return {
                id: attributes.relId,
                source: source,
                target: target,
                relType: attributes.relType,
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
function condenseLeaves(graph: GraphType): GraphType {
    const newGraph = graph.copy(); 
    const leafyNodes: {
        nodeKey: string, 
        entryType: VNID, 
        hiddenNodeNumber:number,
        leavesToDelete: Set<string>,
    }[] = [];
    // iterate over nodes and, for each entry type, if a node has many leaves of that type, add them for condensing
    newGraph.forEachNode(nodeKey => {
        const leaves: Record<VNID, string[]> = {};
        newGraph.forEachNeighbor(nodeKey, neighborKey => {
            const neighborEntryType = graph.getNodeAttribute(neighborKey, 'entryType');
            if (newGraph.neighbors(neighborKey).length === 1) {
                if (leaves[neighborEntryType]) {
                    leaves[neighborEntryType].push(neighborKey);
                } else {
                    leaves[neighborEntryType] = [neighborKey];
                }              
            }
        });

        for (const [entryType, value] of Object.entries(leaves)) {
            if (value.length > 1) {
                leafyNodes.push(
                    {
                        nodeKey: nodeKey,
                        entryType: VNID(entryType),
                        hiddenNodeNumber: value.length,
                        leavesToDelete: new Set<string>(value),
                    }
                );
            }
          }
    });
    // create condensed leaves
    leafyNodes.forEach((leafyNode) => {
        // delete nodes
        leafyNode.leavesToDelete.forEach((leafKey) => {
            newGraph.dropNode(leafKey);
        })
        // add condensed node and edge to it
        const newLeafKey = VNID();
        newGraph.addNode(newLeafKey, {
            label: `${leafyNode.hiddenNodeNumber} entries condensed`, 
            entryType: leafyNode.entryType,
            leavesCondensed: leafyNode.leavesToDelete,
        });
        newGraph.addEdge(leafyNode.nodeKey, newLeafKey);
    })
    return newGraph;
}

/**
 * Given the leafNodeKey for a condensed node, return a new graph with leaf nodes expanded.
 * If leafNodeKey refers to a non-leaf node (does not have list of condensed leaves), returns the input graph copy.
 * ASSUMING the parent node can have only one condensed node of a certain type
 * @param parentNodeKey 
 */
function expandLeaf(
        originalGraph: GraphType,
        currGraph: GraphType,
        parentNodeKey: string,
        entryType: string
    ): GraphType {
    let newGraph = currGraph.copy();
    // find the key of the condensed leaf
    const condensedLeafkey = newGraph.filterNeighbors(parentNodeKey, (_n, attrs) => {
        if (attrs.leavesCondensed) {
            if (attrs.entryType === entryType) {
                return true;
            }
        }
        return false;
    })[0];
    if (!condenseLeaves)  console.log(`The condensed key is ${condensedLeafkey}, something is wrong.`);
    
    const nodesToAdd = newGraph.getNodeAttribute(condensedLeafkey, 'leavesCondensed'); 
    if (nodesToAdd === undefined) {
        console.log('The condensed leaf does not have leavesCondensed attribute.');
    } else {
        nodesToAdd.forEach((leafNode) => {
            // create leaf
            newGraph.addNode(leafNode, originalGraph.getNodeAttributes(leafNode));
            // add edge between parent and leaf
            newGraph = copyEdge(leafNode, parentNodeKey, originalGraph, newGraph);
        })
        // drop condensed node
        newGraph.dropNode(condensedLeafkey);
    }
    return newGraph;
}

/**
 * Copies edge between the target-source nodes from the original graph into the target graph
 * assuming that the nodes exist in both. Does nothing if edge does not exist, or is bidirectional, or there
 * are multiple edges between the nodes in the original graph. Returns copy of the graph with the added edges if any.
 * 
 * Does not support multi graphs yet. Does not support undirected edges.
 */
function copyEdge(node1: string, node2: string, originalGraph: GraphType, targetGraph: GraphType): GraphType {
    const targetGraphCopy = targetGraph.copy();

    const inEdges = originalGraph.inEdges(node1, node2);
    const outEdges = originalGraph.outEdges(node1, node2);
    if (inEdges.length === 1 && outEdges.length === 0) {
        targetGraphCopy.addEdge(node2, node1, originalGraph.getEdgeAttributes(inEdges[0]));
    } else if (inEdges.length === 0 && outEdges.length === 1) {
        targetGraphCopy.addEdge(node1, node2, originalGraph.getEdgeAttributes(outEdges[0]))
    } else if (inEdges.length === 0 && outEdges.length === 0) {
        console.log(`The relationship between ${node2} and ${node1} does not exist.`);
    } else if (inEdges.length === 1 && outEdges.length === 1) {
        console.log(`The relationship between ${node2} and ${node1} is bidirectional.`);
    } else if (inEdges.length > 1 || outEdges.length > 1) {
        console.log(`The relationship between ${node2} and ${node1} has multiple edges.`)
    }
    return targetGraphCopy;
}

/**
 * Given the middleNodeKey for a condensed node, remove the node and add back condensed nodes to the graph
 * If leafNodeKey refers to a non-leaf node (does not have list of condensed leaves), returns the input graph.
 * ASSUMING the parent node can have only one condensed node of a certain type
 * @param parentNodeKey 
 */
function expandSimplePattern(
    originalGraph: GraphType,
    currGraph: GraphType,
    parentNodeKey1: string,
    parentNodeKey2: string,
    entryType: string
) {
    let newGraph = currGraph.copy();
    // find the key of the condensed leaf
    const commonNodes = newGraph.neighbors(parentNodeKey1).filter((n) => {
        return newGraph.neighbors(parentNodeKey2).includes(n);
    })
    const condensedLeaves = commonNodes.filter((n) => {
        const attrs = newGraph.getNodeAttributes(n)
        if (attrs.leavesCondensed) {
            if (attrs.entryType === entryType) {
                return true;
            }
        }
        return false;
    });
    if (!condenseLeaves)  console.log(`The condensed key is ${condensedLeaves}, something is wrong.`);
    if (condenseLeaves.length > 1) console.log('Warning: more than one condesned leaf of this type between these nodes')
    const condensedLeaf = condensedLeaves[0];
    
    const nodesToAdd = newGraph.getNodeAttribute(condensedLeaf, 'leavesCondensed'); 
    if (nodesToAdd === undefined) {
        console.log('The condensed leaf does not have leavesCondensed attribute.');
    } else {
        nodesToAdd.forEach((leafNode) => {
            // create leaf
            newGraph.addNode(leafNode, originalGraph.getNodeAttributes(leafNode));
            // add edge between parent and leaf
            newGraph = copyEdge(leafNode, parentNodeKey1, originalGraph, newGraph);
            newGraph = copyEdge(leafNode, parentNodeKey2, originalGraph, newGraph);
        })
        // drop condensed node
        newGraph.dropNode(condensedLeaf);
    }
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
function condenseSimplePattern(graph: GraphType, relativeEType: VNID): GraphType {
    const newGraph = graph.copy();
    const nodePairs: {
        nodeKey: string,
        endNodeKey: string,
        middleNodeEType: VNID,
        leavesCondensed:Set<string>
    }[] = [];
    
    newGraph.forEachNode(nodeKey => {
        if (graph.getNodeAttribute(nodeKey, 'entryType') !== relativeEType) return;
        //divide neighbours by type = {EntryType: {EndNode, IntermediateNodes}}
        const nTripletsByType: Record<VNID, Record<string, Set<string>>> = {};
        // filter neighbours to have only one other connection to a node of the same type as nodeKey node
        newGraph.forEachNeighbor(nodeKey, (neighborKey) => {
            const nNeighbours = newGraph.neighbors(neighborKey);
            if ((nNeighbours.length !== 2)) return;
            const neighborEntryType = graph.getNodeAttribute(neighborKey, 'entryType');

            const eType1 = graph.getNodeAttribute(nNeighbours[0], 'entryType');
            const eType2 = graph.getNodeAttribute(nNeighbours[1], 'entryType');
            if (eType1 !== eType2) return;

            const endNodeKey = nNeighbours[0] === nodeKey ? nNeighbours[1] : nNeighbours[0];
            // check if the inverse of this node pair already exists
            let pairExists = false;
            nodePairs.forEach((pair) => {
                if (pair.nodeKey === endNodeKey
                    && pair.endNodeKey === nodeKey
                    && pair.middleNodeEType === neighborEntryType
                ) pairExists = true; 
            })
            if (pairExists) return;

            if (!nTripletsByType[neighborEntryType]) nTripletsByType[neighborEntryType] = {};
            if (nTripletsByType[neighborEntryType][endNodeKey]) {
                nTripletsByType[neighborEntryType][endNodeKey].add(neighborKey);
            } else {
                nTripletsByType[neighborEntryType][endNodeKey] = new Set<string>([neighborKey]);
            }       
        });
        for (const [entryType, value] of Object.entries(nTripletsByType)) {
            for (const [endNode, nodeList] of Object.entries(value)) {
                if (nodeList.size > 1) { // if there are more than 1 intermediate nodes, add for condensing
                    nodePairs.push(
                        {
                            nodeKey: nodeKey,
                            endNodeKey: endNode,
                            middleNodeEType: VNID(entryType),
                            leavesCondensed: nodeList,
                        }
                    );
                }
            }
        }
    });
    // create condensed middle nodes
    const pairs = new Set<string>();
    nodePairs.forEach((pair) => {
        const thisPair = pair.endNodeKey + pair.nodeKey;
        if (!pairs.has(thisPair)) {
            pairs.add(thisPair);
            // delete nodes
            pair.leavesCondensed.forEach((middleNodeKey) => newGraph.dropNode(middleNodeKey));
            // add condensed node and edges
            const newLeafKey = VNID();
            newGraph.addNode(newLeafKey, {
                label: `${pair.leavesCondensed.size} entries condensed`, 
                entryType: pair.middleNodeEType,
                leavesCondensed: pair.leavesCondensed, 
            });
            newGraph.addEdge(pair.nodeKey, newLeafKey);
            newGraph.addEdge(pair.endNodeKey, newLeafKey);
        }
    })
    return newGraph;
}

/*
Hide nodes of given entry type as follows: for each deleted node, take all of its neighbours, and connect all of them
with undirected relationsips.
*/
export function hideNodesOfType(graph: GraphType, eTypeToRemove: VNID): GraphType {
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
            // add edges between naighbours
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
export function transformCondenseGraph(graph: GraphType, entryType: VNID) {
    const transformedGraph = condenseLeaves(graph);
    const condensedGraph = condenseSimplePattern(transformedGraph, entryType);
    return condensedGraph;
}

export function transformHideNodesOfType(graph: GraphType, nType: VNID) {
    const transformedGraph = hideNodesOfType(graph, nType);
    return transformedGraph;
}

export function transformExpandLeaves(
    originalDataGraph: GraphType, 
    graph: GraphType, 
    parentKey: string[], 
    entryType: string
) {
    let transformedGraph = graph.copy();
    if (parentKey.length === 1) {
        transformedGraph = expandLeaf(originalDataGraph, graph, parentKey[0], entryType);
    } else if (parentKey.length === 2) {
        transformedGraph = expandSimplePattern(originalDataGraph, graph, parentKey[0], parentKey[1], entryType);
    }
    return transformedGraph;
}