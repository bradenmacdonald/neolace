import { type VNID } from 'neolace-api';
import Link from 'next/link';
import React from 'react';
import { InlineMDT, type MDTContext } from './markdown-mdt/mdt';

interface Props {
    entryId: VNID;
    mdtContext: MDTContext;
}

/**
 * The content to display in a tooltip when hovering over an entry link or a node in the graph.
 */
export const EntryTooltipContent: React.FunctionComponent<Props> = (props: Props) => {
    const refCache = props.mdtContext.refCache;
    const entry = refCache.entries[props.entryId];
    return entry ? <>
        <span className="text-base my-1">
            <Link href={`/entry/${entry.friendlyId}`}>
                <a className="font-bold text-theme-link-color underline">{entry.name}</a>
            </Link>{" "}
            {/* The entry type, in parentheses */}
            ({refCache.entryTypes[entry.entryType.id]?.name})
        </span>
        {/* The entry description */}
        <p className="text-sm">
            <InlineMDT
                mdt={entry.description}
                context={props.mdtContext.childContextWith({entryId: entry.id})}
            />
        </p>
    </> : <p>Error: entry missing from reference cache.</p>
}
