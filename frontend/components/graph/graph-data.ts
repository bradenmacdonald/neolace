import GraphologyGraph from "graphology";
import { ReferenceCacheData, VNID } from "neolace-api";

export const enum NodeType {
    Entry = "entry",
    /**
     * A "placeholder" node represents a cluster of entries that aren't part of the graph, but which can be loaded and
     * added to the graph if the user clicks on them. They are connected to a node in the graph by a relationship which
     * will have 'isPlaceholder: true' until the user clicks to load those entries.
     */
    Placeholder = "placeholder",
}

interface EntryNodeAttributes {
    type: NodeType.Entry,
    name: string;
    entryTypeKey: string;
    isFocusEntry?: boolean;
    /** If the user clicked on a "placeholder" which then got replaced with this node, this is the ID of the placeholder: */
    fromPlaceholder?: string;
    // Data that can get added later by the transform pipeline:
    community?: number;
    nodesCondensed?: Set<string>;
    clique?: number;
    /**
     * (Added by LayoutPipelineTransformer:) Does this node have an outbound or inbound IS A relationship of any kind?
     * Used to lay out such nodes using DAGRE layout before other nodes get layed out.
     */
    _hasIsARelationship?: boolean;
    /**
     * (Added by LayoutPipelineTransformer:) Does this node have any placeholders attached to it?
     */
    _hasPlaceholder?: boolean;
    /**
     * (Added by LayoutPipelineTransformer:) How many neighbors does this node have?
     */
    _numNeighbors?: number;
}
interface PlaceholderNodeAttributes {
    type: NodeType.Placeholder,
    entryCount: number,
    entryId: VNID;
    /**
     * (Added by LayoutPipelineTransformer:) Does this node have an outbound or inbound IS A relationship of any kind?
     * Used to lay out such nodes using DAGRE layout before other nodes get layed out.
     */
    _hasIsARelationship?: boolean;
}

export type NodeAttributes = EntryNodeAttributes|PlaceholderNodeAttributes;
export type CombinedNodeAttributes = {type: NodeType} & Partial<Omit<EntryNodeAttributes, "type">> & Partial<Omit<PlaceholderNodeAttributes, "type">>;

export interface EdgeAttributes {
    relTypeKey: string;
    /**
     * If this is true, this relationship is either to or from a "placeholder" node that represents adjacent entries
     * which aren't part of the graph, but which can be added to the graph if the user clicks on the placeholder to load
     * them.
     */
    isPlaceholder?: true;

    /**
     * (Added by LayoutPipelineTransformer:) Is this an IS A relationship of any kind? (as opposed to RELATES_TO)
     */
    _isIsARelationship?: boolean;
}

export interface GraphAttributes {
    entryTypes: ReferenceCacheData["entryTypes"];
    relationshipTypes: ReferenceCacheData["properties"];
}

export type GraphData = GraphologyGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
export const GraphData = GraphologyGraph as typeof GraphologyGraph<EntryNodeAttributes|PlaceholderNodeAttributes, EdgeAttributes, GraphAttributes>;
// With the GraphData type, setting individual node attributes doesn't work correctly because TypeScript doesn't 
export type MutableGraphData = GraphologyGraph<CombinedNodeAttributes, EdgeAttributes, GraphAttributes>;
