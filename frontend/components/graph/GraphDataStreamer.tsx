/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */

/**
 * A graph that is displayed as the result of the .graph() lookup function.
 */
import React from "react";
import { SDK, client, useRefCache, useSiteData } from "lib/sdk";
import { MDTContext } from "../markdown-mdt/mdt";
import { ReferenceCacheData } from "neolace-sdk";
import { debugLog } from "lib/config";
import { GraphData, NodeType } from "./graph-data";
import { GraphViewer } from "./GraphViewer";
import { useStateRef } from "lib/hooks/useStateRef";
import { MergeRefCache } from "components/utils/MergeRefCache";

export interface Props {
    /**
     * The set of entries and relationships that are in the graph at first.
     * More data can be added ("streamed") interactively by the user, though doing so won't change this value.
     * However, if the parent component does change this value, all the extra "streamed" data added by the user will be
     * reset.
     */
    value: SDK.GraphValue;
    mdtContext: MDTContext;
}

const idForPlaceholder = (p: { entryId: SDK.VNID; relTypeKey: string; isOutbound: boolean }) => `ph${p.entryId}_${p.relTypeKey}_${p.isOutbound?"o":"i"}`;

/**
 * Render a graph of entries, starting with some initial set of entries (a GraphValue returned from the x.graph()
 * lookup function), and optionally loading ("streaming") additional entries/relationships from the server on demand.
 *
 * e.g. This can initially show a graph of a few entries but the user can click to load additional related entries.
 *
 * This component is responsible for:
 *  - detecting when the initial GraphValue has changed
 *  - loading additional entries from the server and adding them to the combined graph value
 *  - NOT sending a changed value to the inner <LookupGraph> component unless there is new data.
 */
export const GraphDataStreamer: React.FunctionComponent<Props> = (props) => {
    const baseRefCache = useRefCache();
    const {site} = useSiteData();

    // The data (nodes and relationships) that we want to display as a graph.
    const [additionalDataLoaded, setAdditionalDataLoaded, additionalDataLoadedRef] = useStateRef<{
        /**
         * This string of the form `ph${entryId}_${relTypeKey}_[i|o]` identifies which placeholder was used to load this
         * particular group/page of additional nodes.
         */
        fromPlaceholder: string,
        value: SDK.GraphValue,
        refCache: SDK.ReferenceCacheData,
    }[]>([]);

    // This is the same as props.value, except it won't change unless the value (not just the reference) has changed.
    const [baseData, setBaseData, baseDataRef] = useStateRef(props.value);

    // Smart data change detection. Keep this inside a new scope since no code below should access these details.
    {
        // Store the previous value of things so we can see when they change:
        const [prevValueJSON, setPrevValueJSON] = React.useState(JSON.stringify(props.value));
        // Check if anything changed:
        const currentValueJSON = JSON.stringify(props.value);
        const baseValueChanged = currentValueJSON !== prevValueJSON;
        // NOTE: we don't bother to watch for changes to 'refCache' outside of changes to props.value
        if (baseValueChanged) {
            debugLog(`Base graph data changed - GraphDataStreamer will reset all data.`);
            setPrevValueJSON(currentValueJSON);
            setBaseData(props.value);
            setAdditionalDataLoaded([]);
        }
    }

    // Our callback to load/"stream" additional data (expand a "placeholder" node to show new entries)
    const expandPlaceholder = React.useCallback(async (placeholderId: string) => {
        const currentBaseData = baseDataRef.current;
        const borderingRelationships = [
            currentBaseData.borderingRelationships,
            ...additionalDataLoadedRef.current.map(ad => ad.value.borderingRelationships)
        ].flat();
        const placeholder = borderingRelationships.find(br => idForPlaceholder(br) === placeholderId);
        if (!placeholder) return; // Silently stop here. Maybe the whole graph has changed so the placeholder is no longer relevant.

        // We always include placeholder.entryId in the set of entries we want to retrieve, so that we're sure to load
        // the relationship between the new entries and that existing entry.
        const expr = `[entry("${placeholder.entryId}") , entry("${placeholder.entryId}").${placeholder.isOutbound ? "get" : "reverse"}(prop=prop("${placeholder.relTypeKey}"))].graph()`;
        const {resultValue, referenceCache} = await client.evaluateLookupExpression(expr, {siteKey: site.key});
        // Check if the overall graph has changed while we were loading that.
        if (currentBaseData !== baseDataRef.current) return;
        if (resultValue.type !== "Graph") throw new Error(`When expanding placeholder, expected a Graph value but got ${resultValue.type}`);
        // Now add the additional data:
        setAdditionalDataLoaded((adl) => [...adl, {
            fromPlaceholder: placeholderId,
            value: resultValue,
            refCache: referenceCache,
        }]);
    }, [baseDataRef, additionalDataLoadedRef, setAdditionalDataLoaded, site.key]); // These "Ref" objects will never change, so this callback never changes.

    // Combine 'baseData' (props.value) with 'additionalGraphData', and convert to Graphology format:
    const data: GraphData = React.useMemo(() => {

        const allData: {value: SDK.GraphValue, refCache: SDK.ReferenceCacheData, fromPlaceholder?: string}[] = [
            {value: baseData, refCache: baseRefCache},
            ...additionalDataLoaded,
        ];

        const graphData: GraphData = new GraphData({
        /** We do allow entries to have relationships to themselves. */
            allowSelfLoops: true,
            /** There CAN be multiple relationships [of different types] between a given pair of entries. */
            multi: true,
        });

        const entryTypes: ReferenceCacheData["entryTypes"] = {};
        const relationshipTypes: ReferenceCacheData["properties"] = {};

        for (const {value, refCache, fromPlaceholder} of allData) {
            // Add the entries:
            for (const { entryId, name, entryTypeKey, ...attrs } of value.entries) {
                if (graphData.hasNode(entryId)) {
                    continue;
                }
                graphData.addNode(entryId, { type: NodeType.Entry, name, entryTypeKey, ...attrs, ...{fromPlaceholder}});
                // And collect data about each entry type that's used in the graph:
                if (entryTypes[entryTypeKey] === undefined) {
                    entryTypes[entryTypeKey] = refCache.entryTypes[entryTypeKey];
                }
            }
            // Add the relationships (edges):
            for (const {relId, relTypeKey, fromEntryId, toEntryId} of value.rels) {
                if (graphData.hasEdge(relId)) {
                    continue;
                }
                graphData.addDirectedEdgeWithKey(relId, fromEntryId, toEntryId, {relTypeKey});
                // And collect data about each relationship type that's used in the graph:
                if (relationshipTypes[relTypeKey] === undefined) {
                    relationshipTypes[relTypeKey] = refCache.properties[relTypeKey];
                }
            }
        }

        const placeholdersLoaded = additionalDataLoaded.map(ad => ad.fromPlaceholder);
        // Finally, after all the actual data has loaded, add in placeholders for the entries on the border of the graph
        // which aren't loaded yet, but which the user can click on to load them and add them to the graph.
        const entryIdsInPreviousDatasets = new Set<string>();
        for (const {value, refCache} of allData) {
            for (const { entryId, relTypeKey, isOutbound, entryCount } of value.borderingRelationships) {
                // This is the ID of the 'placeholder' node:
                const placeholderId = idForPlaceholder({entryId, relTypeKey, isOutbound});
                if (placeholdersLoaded.includes(placeholderId)) {
                    // We don't need to display this placeholder anymore because its data has been loaded and added to the graph.
                    continue;
                }
                if (graphData.hasNode(placeholderId)) {
                    continue;
                }
                if (entryIdsInPreviousDatasets.has(entryId)) {
                    // Don't add new placeholders for an entry that was loaded in an earlier dataset. That entry's
                    // placeholder was most likely already expanded, and has been removed from the graph, so we don't
                    // want to add it back.
                    continue;
                }
                
                // This is the ID of the edge connecting the placeholder to an entry in the graph.
                // It must be different from placeholder ID because G6 uses the same namespace for nodes and edges.
                const placeholderRelId = `rel_${placeholderId}`;
                graphData.addNode(placeholderId, { type: NodeType.Placeholder, entryCount, entryId });
                const fromNode = isOutbound ? entryId : placeholderId;
                const toNode = isOutbound ? placeholderId : entryId;
                graphData.addDirectedEdgeWithKey(placeholderRelId, fromNode, toNode, { relTypeKey, isPlaceholder: true });
                // And make sure we're still collecting data about each relationship type that's used in the graph:
                if (relationshipTypes[relTypeKey] === undefined) {
                    relationshipTypes[relTypeKey] = refCache.properties[relTypeKey] ?? { name: "Missing from ref cache" };
                }
            }
            value.entries.forEach(({entryId}) => entryIdsInPreviousDatasets.add(entryId));
        }

        graphData.setAttribute("entryTypes", Object.freeze(entryTypes));
        graphData.setAttribute("relationshipTypes", Object.freeze(relationshipTypes));

        return graphData;
        // We don't care if 'baseRefCache' changes - only update the Graph if additional data was loaded.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseData, additionalDataLoaded])

    // We use <MergeRefCache> to add any additionally loaded refCaches into the base refCache that's already present.
    // Without this, if you clicked and loaded additional nodes into the graph, they wouldn't have any
    // description/details if you click on them to show their tooltip.
    return <MergeRefCache mergeCaches={additionalDataLoaded.map(ad => ad.refCache)}>
        <GraphViewer data={data} expandPlaceholder={expandPlaceholder} />
    </MergeRefCache>
};
