/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import Link from "next/link";
import { SDK, useRefCache, useSiteData } from "lib/sdk";
import { DEVELOPMENT_MODE } from "lib/config";
import { Tooltip } from "components/widgets/Tooltip";
import { MDTContext } from "components/markdown-mdt/mdt";
import { EntryTooltipContent } from "./EntryTooltipContent";

interface Props {
    /** VNID or key */
    entryKey: string;
    mdtContext: MDTContext;
    children: React.ReactNode;
}

/**
 * A link to an entry (on the same site)
 */
export const EntryLink: React.FunctionComponent<Props> = (props) => {
    const { site } = useSiteData();
    const refCache = useRefCache();
    const currentEntryId = props.mdtContext.entryId;

    const entry: undefined|(NonNullable<SDK.EntryData["referenceCache"]>["entries"]["entryId"]) =
        SDK.isVNID(props.entryKey) ? refCache.entries[props.entryKey]
        : Object.values(refCache.entries).find(e => e.key === props.entryKey);
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its key either.
        // In development, we want to highlight links that should be in the reference cache, but are not.
        const textColorClass = DEVELOPMENT_MODE ? "text-red-600 font-bold" : "";
        return (
            <Link href={`/entry/${props.entryKey}`} className={textColorClass}>
                {props.children}
            </Link>
        );
    }

    if (entry.id === currentEntryId) {
        // This is the current entry, so we don't really need to display it as a link.
        return <>{props.children}</>;
    }

    if (site.frontendConfig.features?.hoverPreview?.enabled && !props.mdtContext.disableInteractiveFeatures) {
        return (
            <Tooltip
                tooltipContent={
                    <EntryTooltipContent
                        entryId={entry.id}
                        mdtContext={props.mdtContext}
                    />
                }
            >
                {(attribs) => (
                    <Link href={`/entry/${entry.key}`} {...attribs}>
                        {props.children}
                    </Link>
                )}
            </Tooltip>
        );
    } else {
        return (
            <Link href={`/entry/${entry.key}`}>
                {props.children}
            </Link>
        );
    }
};
