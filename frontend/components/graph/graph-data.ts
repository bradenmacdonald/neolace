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
}
interface PlaceholderNodeAttributes {
    type: NodeType.Placeholder,
    entryCount: number,
    entryId: VNID;
}

export type NodeAttributes = EntryNodeAttributes|PlaceholderNodeAttributes;

export interface EdgeAttributes {
    relTypeKey: string;
    /**
     * If this is true, this relationship is either to or from a "placeholder" node that represents adjacent entries
     * which aren't part of the graph, but which can be added to the graph if the user clicks on the placeholder to load
     * them.
     */
    isPlaceholder?: true;
}

export interface GraphAttributes {
    entryTypes: ReferenceCacheData["entryTypes"];
    relationshipTypes: ReferenceCacheData["properties"];
}

export type GraphData = GraphologyGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
export const GraphData = GraphologyGraph as typeof GraphologyGraph<EntryNodeAttributes|PlaceholderNodeAttributes, EdgeAttributes, GraphAttributes>;
