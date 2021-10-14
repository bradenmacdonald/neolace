import React from 'react';
import Link from 'next/link';
import { api, isVNID } from 'lib/api-client';
import { FormattedListParts, FormattedMessage } from 'react-intl';
import { Tooltip } from 'components/widgets/tooltip';
import { InlineMDT, MDTContext } from './markdown-mdt/mdt';

interface Props {
    /** VNID or friendlyId */
    entryKey: string;
    refCache: api.EntryData["referenceCache"];
    mdtContext: MDTContext;
    children: React.ReactNode;
}

/**
 * A link to an entry (on the same site)
 */
export const EntryLink: React.FunctionComponent<Props> = (props) => {

    let entry: undefined|api.EntryData["referenceCache"]["entries"]["entryId"];
    if (isVNID(props.entryKey)) {
        entry = props.refCache.entries[props.entryKey];
    } else {
        entry = Object.values(props.refCache.entries).find(e => e.friendlyId === props.entryKey);
    }
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its friendlyId either.
        return <Link href={`/entry/${props.entryKey}`}><a className="text-red-700 font-bold">{props.children}</a></Link>
    }
    return <Tooltip tooltipContent={<>
        <strong>{entry.name}</strong> ({props.refCache.entryTypes[entry.entryType.id].name})<br/>
        <p className="text-sm"><InlineMDT mdt={entry.description} context={props.mdtContext} /></p>
    </>}>
        {attribs => <Link href={`/entry/${entry.friendlyId}`}><a {...attribs}>{props.children}</a></Link>}
    </Tooltip>;
};
