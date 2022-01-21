import React from 'react';
import Link from 'next/link';
import { api, isVNID } from 'lib/api-client';
import { DEVELOPMENT_MODE } from 'lib/config';
import { FormattedListParts, FormattedMessage } from 'react-intl';
import { Tooltip } from 'components/widgets/tooltip';
import { InlineMDT, MDTContext } from './markdown-mdt/mdt';
import { SiteContext } from './SiteContext';

interface Props {
    /** VNID or friendlyId */
    entryKey: string;
    mdtContext: MDTContext;
    children: React.ReactNode;
}

/**
 * A link to an entry (on the same site)
 */
export const EntryLink: React.FunctionComponent<Props> = (props) => {

    const siteContext = React.useContext(SiteContext);

    const refCache = props.mdtContext.refCache;
    let entry: undefined|api.EntryData["referenceCache"]["entries"]["entryId"];
    if (isVNID(props.entryKey)) {
        entry = refCache.entries[props.entryKey];
    } else {
        entry = Object.values(refCache.entries).find(e => e.friendlyId === props.entryKey);
    }
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its friendlyId either.
        // In development, we want to highlight links that should be in the reference cache, but are not.
        const textColorClass = DEVELOPMENT_MODE ? "text-red-600 font-bold" : "";
        return <Link href={`/entry/${props.entryKey}`}><a className={textColorClass}>{props.children}</a></Link>
    }

    if (siteContext.frontendConfig.features?.hoverPreview?.enabled) {
        return <Tooltip tooltipContent={<>
            <strong>{entry.name}</strong> ({refCache.entryTypes[entry.entryType.id]?.name})<br/>
            <p className="text-sm"><InlineMDT mdt={entry.description} context={props.mdtContext.childContextWith({entryId: entry.id})} /></p>
        </>}>
            {attribs => <Link href={`/entry/${entry.friendlyId}`}><a {...attribs}>{props.children}</a></Link>}
        </Tooltip>;
    } else {
        return <Link href={`/entry/${entry.friendlyId}`}><a>{props.children}</a></Link>;
    }

};
