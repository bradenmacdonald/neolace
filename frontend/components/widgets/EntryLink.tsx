import React from "react";
import Link from "next/link";
import { api, useSiteData } from "lib/api";
import { DEVELOPMENT_MODE } from "lib/config";
import { Tooltip } from "components/widgets/Tooltip";
import { MDTContext } from "components/markdown-mdt/mdt";
import { EntryTooltipContent } from "./EntryTooltipContent";

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
    const { site } = useSiteData();

    const refCache = props.mdtContext.refCache;
    const entry: undefined|(NonNullable<api.EntryData["referenceCache"]>["entries"]["entryId"]) =
        api.isVNID(props.entryKey) ? refCache.entries[props.entryKey]
        : Object.values(refCache.entries).find(e => e.friendlyId === props.entryKey);
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its friendlyId either.
        // In development, we want to highlight links that should be in the reference cache, but are not.
        const textColorClass = DEVELOPMENT_MODE ? "text-red-600 font-bold" : "";
        return (
            <Link href={`/entry/${props.entryKey}`} className={textColorClass}>
                {props.children}
            </Link>
        );
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
                    <Link href={`/entry/${entry.friendlyId}`} {...attribs}>
                        {props.children}
                    </Link>
                )}
            </Tooltip>
        );
    } else {
        return (
            <Link href={`/entry/${entry.friendlyId}`}>
                {props.children}
            </Link>
        );
    }
};
