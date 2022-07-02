import React from 'react';
import { Portal } from 'components/utils/Portal';
import { api, useLookupExpression } from 'lib/api-client';
import { LookupValue } from 'components/LookupValue';
import { MDTContext } from 'components/markdown-mdt/mdt';


interface Props {
    /** What the user has typed, that we're using as a search term */
    searchTerm: string;
    /** CSS position for this menu, e.g. "400px" */
    positionLeft: string;
    /** CSS position for this menu, e.g. "400px" */
    positionTop: string;
}

/**
 * An autocompletion menu, that displays entries, properties, and entry types that match the current search.
 */
export const AutocompletionMenu: React.FunctionComponent<Props> = ({ searchTerm, ...props }) => {
    // Use the basicSearch() function to fetch all entries, properties, and entry types that match the search term.
    // If the search term is an empty string, this is just a list of all entries, properties, and entry types.
    const { result, error } = useLookupExpression(`basicSearch(${JSON.stringify(searchTerm)})`);

    // We store the results in a state so that we can display the previous values while new ones are loading.
    const [items, setItems] = React.useState<Array<api.EntryValue | api.PropertyValue | api.EntryTypeValue>>([]);
    const [refCache, setRefCache] = React.useState<api.ReferenceCacheData>({
        entries: {},
        entryTypes: {},
        lookups: [],
        properties: {},
    });

    React.useEffect(() => {
        if (result?.referenceCache === undefined) {
            return; // Wait while the next set of autocompletion items loads.
        }
        // TODO: update the reference cache based on the draft.
        const { entries, entryTypes, properties } = result.referenceCache;
        console.log("Recalculating");

        const searchTermLower = searchTerm.toLowerCase();
        const newItems: Array<(api.EntryValue | api.PropertyValue | api.EntryTypeValue) & { name: string }> = [];

        // Now, a basic version of this could just use the entries/properties/types in result.resultValue, but that
        // doesn't account for changes coming from the draft or unsaved edits, which affect the reference cache only. So
        // we instead get the list of items from the reference cache, which we know will contain all the matching items,
        // including additions, changes, or deletions made by the draft / unsaved edits.
        for (const entry of Object.values(entries)) {
            if (entry.name.toLowerCase().includes(searchTermLower) || entry.friendlyId.includes(searchTermLower)) {
                newItems.push({ type: "Entry", id: entry.id, name: entry.name });
            }
        }
        for (const entryType of Object.values(entryTypes)) {
            if (entryType.name.toLowerCase().includes(searchTermLower)) {
                newItems.push({ type: "EntryType", id: entryType.id, name: entryType.name });
            }
        }
        for (const property of Object.values(properties)) {
            if (property.name.toLowerCase().includes(searchTermLower)) {
                newItems.push({ type: "Property", id: property.id, name: property.name });
            }
        }

        newItems.sort((a, b) => a.name.localeCompare(b.name));

        setItems(newItems);
        setRefCache(result.referenceCache);
    }, [result?.referenceCache, searchTerm]);

    const mdtContext = React.useMemo(() => new MDTContext({ refCache }), [refCache]);

    if (error) {
        console.error(error);
        return null;
    } else if (items.length === 0) {
        return null;
    }

    return (
        // We pass in className here to remove the "fixed" property from the <Portal>. If we later change <Portal> to
        // not be "fixed" by default, we can remove this.
        <Portal>
            <div
                className="absolute border rounded bg-white border-slate-700"
                style={{ left: props.positionLeft, top: props.positionTop }}
            >
                <ul>
                    {items.map((item) => (
                        <li key={item.id}>
                            <LookupValue value={item} mdtContext={mdtContext} />
                        </li>
                    ))}
                </ul>
            </div>
        </Portal>
    );
};
