import React from 'react';
import Link from 'next/link';
import { api } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';

interface LookupValueProps {
    value: api.AnyLookupValue;
    refCache: api.EntryData["referenceCache"];
    children?: never;
}

/**
 * Render a Lookup Value (computed/query value, such as all the "properties" shown on an entry's page)
 */
export const LookupValue: React.FunctionComponent<LookupValueProps> = (props) => {

    const {value} = props;
    if (typeof value !== "object" || value === null || !("type" in value)) {
        return <p>[ERROR INVALID VALUE, NO TYPE INFORMATION]</p>;  // Doesn't need i18n, internal error message shouldn't be seen
    }

    switch (value.type) {
        case "Page": {

            const listValues = value.values.map((v, idx) => 
                <LookupValue key={idx} value={v} refCache={props.refCache} />
            );
            if (listValues.length < value.totalCount) {
                listValues.push(
                    <FormattedMessage 
                        id="common.list.xmore"
                        defaultMessage="{extraCount, plural, one {# more…} other {# more…}}"
                        values={{extraCount: value.totalCount - listValues.length}}
                        description="How many more items there are (at the end of a list)"
                    />
                );
            }

            return <span className="neo-lookup-paged-values">
                <FormattedListParts type="unit" value={listValues}>
                    {parts => <>{parts.map(p => p.value)}</>}
                </FormattedListParts>
            </span>;
        }
        case "Entry":
        case "AnnotatedEntry": {
            const entry = props.refCache.entries[value.id];
            if (entry === undefined) {
                return <Link href={`/entry/${value.id}`}><a className="text-red-700 font-bold">{value.id}</a></Link>
            }
            return <Link href={`/entry/${entry.friendlyId}`}><a>{entry.name}</a></Link>
        }
        default: {
            return <code>{JSON.stringify(value)}</code>;
        }
    }
};
