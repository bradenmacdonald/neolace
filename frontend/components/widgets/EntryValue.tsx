import React from 'react';
import Link from 'next/link';
import { api, useSiteData } from 'lib/api-client';
import { DEVELOPMENT_MODE } from 'lib/config';
import { Tooltip } from 'components/widgets/Tooltip';
import { InlineMDT, MDTContext } from 'components/markdown-mdt/mdt';
import { EntryTooltipContent } from 'components/EntryTooltipContent';
import { Icon } from './Icon';

interface Props {
    entryId: api.VNID;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * The standard way to display an entry
 */
export const EntryValue: React.FunctionComponent<Props> = (props) => {
    const {site} = useSiteData();

    const refCache = props.mdtContext.refCache;
    const entry: undefined|(NonNullable<api.EntryData["referenceCache"]>["entries"]["entryId"]) = refCache.entries[props.entryId];
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its friendlyId either.
        // In development, we want to highlight links that should be in the reference cache, but are not.
        const textColorClass = DEVELOPMENT_MODE ? "text-red-600 font-bold" : "";
        return <Link href={`/entry/${props.entryId}`}><a className={textColorClass}>Entry {props.entryId}</a></Link>
    }

    const colors = api.entryTypeColors[refCache.entryTypes[entry.entryType.id]?.color ?? api.EntryTypeColor.Default];
    const abbrev = refCache.entryTypes[entry.entryType.id]?.abbreviation ?? "";

    const widget = <span className="text-sm font-medium font-sans">
        <span className="rounded-l-md py-[2px] min-w-[2em] text-center inline-block" style={{backgroundColor: colors[1], color: colors[2]}}>
            <span className="text-xs inline-block min-w-[1.4em] text-center opacity-40">{abbrev}</span>
        </span>
        <span className="rounded-r-md py-[3px] px-2" style={{backgroundColor: colors[0], color: colors[2]}}>{entry.name}</span>
    </span>;

    if (site.frontendConfig.features?.hoverPreview?.enabled && !props.mdtContext.disableHoverPreview) {
        return <Tooltip tooltipContent={<EntryTooltipContent
            entryId={entry.id}
            mdtContext={props.mdtContext}
        />}>
            {attribs => <Link href={`/entry/${entry.friendlyId}`}><a className="unstyled" {...attribs}>{widget}</a></Link>}
        </Tooltip>;
    } else {
        return <Link href={`/entry/${entry.friendlyId}`}><a className="unstyled">{widget}</a></Link>;
    }

};
