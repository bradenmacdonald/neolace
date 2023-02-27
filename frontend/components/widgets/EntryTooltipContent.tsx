import React from "react";
import Link from "next/link";
import { type VNID } from "neolace-sdk";

import { useRefCache } from "lib/sdk";
import { InlineMDT, type MDTContext } from "../markdown-mdt/mdt";

interface Props {
    entryId: VNID;
    mdtContext: MDTContext;
}

/**
 * The content to display in a tooltip when hovering over an entry link (or a node in the graph).
 */
export const EntryTooltipContent: React.FunctionComponent<Props> = (props: Props) => {
    const refCache = useRefCache();
    const entry = refCache.entries[props.entryId];
    return entry ? <>
        <span className="text-base my-1">
            <Link
                href={`/entry/${entry.key}`}
                className="font-bold text-theme-link-color underline"
            >
                {entry.name}
            </Link>{" "}
            {/* The entry type, in parentheses */}
            ({refCache.entryTypes[entry.entryType.key]?.name})
        </span>
        {/* The entry description */}
        <p className="text-sm">
            <InlineMDT
                mdt={entry.description}
                context={props.mdtContext.childContextWith({entryId: entry.id, disableInteractiveFeatures: true})}
            />
        </p>
    </> : <p>Error: entry missing from reference cache.</p>;
}
