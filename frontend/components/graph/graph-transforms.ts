import { PropertyType } from "neolace-api";
import { GraphData, NodeType } from "./graph-data";
import louvain from 'graphology-communities-louvain';

export interface GraphTransformer {
    (graphData: GraphData): void;
}

/**
 * When this transformer is active, it removes "placeholder" nodes from the graph. Those are the faded out nodes that
 * you can click on to load additional data into the graph.
 */
export const RemovePlaceholdersTransformer: GraphTransformer = (graphData) => {
    graphData.forEachNode((nodeId, attrs) => {
        if (attrs.type === NodeType.Placeholder) {
            graphData.dropNode(nodeId);
        }
    });
};

/**
 * This transformer runs a community detection algorithm to detect groups of related nodes.
 */
export const DetectCommunitiesTransformer: GraphTransformer = (graphData) => {
    // TBD: should we first rcreate a subgraph that doesn't have the placeholders, then run this on that subgraph?

    // Runs the Louvain algorithm to detect communities in the given graph:
    louvain.assign(graphData);

    // In the <GraphViewer> code's updateGraphData() function, the 'community' attribute will be used to override the
    // color of the entry node.
};


/**
 * Add extra data to each node and edge that is required for our "layout pipeline" to determine which layouts apply to
 * which nodes/edges. (We use DAGRE for the nodes/edges that have hierarchical relationships, then force for the rest.)
 * @param graphData 
 */
export const LayoutPipelineTransformer: GraphTransformer = (graphData) => {

    const relationshipTypes = graphData.getAttribute("relationshipTypes");

    graphData.forEachEdge((edgeId, attrs, source, target) => {
        if (attrs.isPlaceholder) {
            if (graphData.getNodeAttribute(source, "type") === NodeType.Placeholder) {
                graphData.mergeNodeAttributes(target, {_hasPlaceholder: true});
            } else {
                graphData.mergeNodeAttributes(source, {_hasPlaceholder: true});
            }
        }
        const relDetails = relationshipTypes[attrs.relTypeKey];
        if (relDetails?.type === PropertyType.RelIsA) {
            // This is an IS A relationship. Mark it and the nodes so that our layout algorithm knows this.
            graphData.mergeNodeAttributes(source, {_hasIsARelationship: true});
            graphData.mergeNodeAttributes(target, {_hasIsARelationship: true});
            graphData.mergeEdgeAttributes(edgeId, {_isIsARelationship: true});
        }
    });
};
