/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from 'react';
import { Portal } from 'components/utils/Portal';
import { SDK, RefCacheContext, useDraft, useLookupExpression } from 'lib/sdk';
import { InlineMDT, MDTContext } from 'components/markdown-mdt/mdt';
import { EntitySymbol } from "../widgets/EntitySymbol";
import { IncreaseZIndex, useZIndex } from "lib/hooks/useZIndex";


type EntityValue = SDK.EntryValue | SDK.PropertyValue | SDK.EntryTypeValue;


interface Props {
    /** What the user has typed, that we're using as a search term */
    searchTerm: string;
    /** CSS position for this menu, e.g. "400px" */
    positionLeft: string;
    /** CSS position for this menu, e.g. "400px" */
    positionTop: string;
    /** Handler for when the user makes a selection from the dropdown */
    onClick: (value: EntityValue) => void;
}

/**
 * An autocompletion menu, that displays entries, properties, and entry types that match the current search.
 */
export const AutocompletionMenu: React.FunctionComponent<Props> = ({ searchTerm, ...props }) => {
    // Use the basicSearch() function to fetch all entries, properties, and entry types that match the search term.
    // If the search term is an empty string, this is just a list of all entries, properties, and entry types.
    const { resultValue, newReferenceCache, error } = useLookupExpression(`basicSearch(${JSON.stringify(searchTerm)})`);
    const [draft, unsavedEdits] = useDraft();

    // We store the results in a state so that we can display the previous values while new ones are loading.
    const [items, setItems] = React.useState<Array<EntityValue>>([]);
    const [refCache, setRefCache] = React.useState<SDK.ReferenceCacheData>({
        entries: {},
        entryTypes: {},
        lookups: [],
        properties: {},
    });

    React.useEffect(() => {
        if (resultValue === undefined) {
            return; // Wait while the next set of autocompletion items loads.
        }
        let referenceCache = newReferenceCache;
        // IF we are in the context of a draft, update the result with edits from the draft:
        if (draft || unsavedEdits) {
            referenceCache = SDK.applyEditsToReferenceCache(referenceCache, [...(draft?.edits ?? []), ...unsavedEdits]);
        }
        const { entries, entryTypes, properties } = referenceCache;

        const searchTermLower = searchTerm.toLowerCase();
        const newItems: Array<(EntityValue) & { name: string; exactMatch?: boolean; }> = [];

        // Now, a basic version of this could just use the entries/properties/types in result.resultValue, but that
        // doesn't account for changes coming from the draft or unsaved edits, which affect the reference cache only. So
        // we instead get the list of items from the reference cache, which we know will contain all the matching items,
        // including additions, changes, or deletions made by the draft / unsaved edits.
        for (const entry of Object.values(entries)) {
            const nameLower = entry.name.toLowerCase();
            if (nameLower.includes(searchTermLower) || entry.key.includes(searchTermLower)) {
                newItems.push({
                    type: "Entry",
                    id: entry.id,
                    name: entry.name,
                    exactMatch: (nameLower === searchTermLower || entry.key.toLowerCase() === searchTermLower),
                });
            }
        }
        for (const entryType of Object.values(entryTypes)) {
            const nameLower = entryType.name.toLowerCase();
            if (nameLower.includes(searchTermLower)) {
                newItems.push({ type: "EntryType", key: entryType.key, name: entryType.name, exactMatch: nameLower === searchTermLower });
            }
        }
        for (const property of Object.values(properties)) {
            const nameLower = property.name.toLowerCase();
            if (nameLower.includes(searchTermLower)) {
                newItems.push({ type: "Property", key: property.key, name: property.name, exactMatch: nameLower === searchTermLower });
            }
        }

        // Sort the items by name, but always put exact matches first.
        newItems.sort((a, b) => a.exactMatch ? -1 : b.exactMatch ? 1 : a.name.localeCompare(b.name));

        setItems(newItems);
        setRefCache(referenceCache);
    }, [resultValue, newReferenceCache, searchTerm, draft, unsavedEdits]);

    const mdtContext = React.useMemo(() => new MDTContext({ disableInteractiveFeatures: true }), []);
    const zIndex = useZIndex({increaseBy: IncreaseZIndex.ForDropdown});

    if (error) {
        console.error(error);
        return null;
    } else if (items.length === 0) {
        return null;
    }

    return (
        <RefCacheContext.Provider value={{refCache}}>
            {/* We pass in className here to remove the "fixed" property from the <Portal>. If we later change <Portal> to
            not be "fixed" by default, we can remove this. */}
            <Portal>
                <div
                    className="absolute border rounded bg-white border-slate-700 shadow-md"
                    style={{ left: props.positionLeft, top: props.positionTop, zIndex }}
                >
                    <ul>
                        {items.slice(0, 8).map((item) => (
                            <li key={"id" in item ? item.id : item.key} className="
                                p-1 text-sm hover:bg-blue-50 border-b border-b-slate-200
                                cursor-default
                                first:rounded-t last:rounded-b last:border-b-0
                            " onClick={() => props.onClick(item)}>
                                <div className="pb-1">
                                    <span className="w-8 inline-block">
                                        <EntitySymbol value={item} defaultBg="bg-transparent" />
                                    </span>
                                    <strong>
                                        {
                                            item.type === "Entry" ? (refCache.entries[item.id]?.name ?? item.id)
                                            : item.type === "EntryType" ? (refCache.entryTypes[item.key]?.name ?? item.key)
                                            : item.type === "Property" ? (refCache.properties[item.key]?.name ?? item.key)
                                            : null
                                        }
                                    </strong>{" "}
                                    <span className="text-xs text-gray-600">
                                        {
                                            item.type === "Entry" ? <>
                                                (
                                                    {refCache.entryTypes[refCache.entries[item.id]?.entryType.key]?.name},{" "}
                                                    <span className="font-mono text-xs ml-1">{refCache.entries[item.id]?.key}</span>
                                                )
                                            </>
                                            : item.type === "EntryType" ? <>(Entry Type)</>
                                            : item.type === "Property" ? <>(Property)</>
                                            : null
                                        }
                                    </span>
                                </div>
                                <div className="whitespace-nowrap overflow-hidden overflow-ellipsis max-w-sm text-xs ml-8">
                                    {
                                        item.type === "Entry" ? <InlineMDT mdt={refCache.entries[item.id]?.description} context={mdtContext.childContextWith({entryId: item.id})}/> :
                                        item.type === "EntryType" ? <>&nbsp;</> :
                                        item.type === "Property" ? refCache.properties[item.key]?.description
                                        : null
                                    }
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </Portal>
        </RefCacheContext.Provider>
    );
};
