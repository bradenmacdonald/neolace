import React from 'react';
import Link from 'next/link';
import { api } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';
import { Tooltip } from 'components/widgets/tooltip';
import { InlineMDT, MDTContext } from './markdown-mdt/mdt';

interface LookupValueProps {
    value: api.AnyLookupValue;
    refCache: api.EntryData["referenceCache"];
    mdtContext: MDTContext;
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
                <LookupValue key={idx} value={v} refCache={props.refCache} mdtContext={props.mdtContext} />
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
            return <Tooltip tooltipContent={<>
                <strong>{entry.name}</strong> ({props.refCache.entryTypes[entry.entryType.id].name})<br/>
                <p className="text-sm"><InlineMDT mdt={entry.description} context={props.mdtContext} /></p>
            </>}>
                {attribs => <Link href={`/entry/${entry.friendlyId}`}><a {...attribs}>{entry.name}</a></Link>}
            </Tooltip>
        }
        case "String":
            return <>{value.value}</>;
        case "InlineMarkdownString":
            return <InlineMDT mdt={value.value} context={props.mdtContext} />;
        case "Error":
            return <span className="neo-lookup-error text-sm text-red-900">
                <FormattedMessage 
                    id="common.lookup-expression.error"
                    defaultMessage="Error ({errorType}): {errorMessage}"
                    values={{errorType: value.errorClass, errorMessage: value.message}}
                />
            </span>
        default: {
            return <code>{JSON.stringify(value)}</code>;
        }
    }
};
