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
import { EntryTooltipContent } from "components/widgets/EntryTooltipContent";

interface Props {
    entryId: SDK.VNID;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * The standard way to display an entry
 */
export const EntryValue: React.FunctionComponent<Props> = (props) => {
    const { site } = useSiteData();
    const refCache = useRefCache();

    const entry: undefined | (NonNullable<SDK.EntryData["referenceCache"]>["entries"]["entryId"]) =
        refCache.entries[props.entryId];
    if (entry === undefined) {
        // This entry is not in the reference cache! It should have been though...
        // So we don't know its name and may not know its key either.
        // In development, we want to highlight links that should be in the reference cache, but are not.
        const textColorClass = DEVELOPMENT_MODE ? "text-red-600 font-bold" : "";
        return (
            <Link href={`/entry/${props.entryId}`} className={textColorClass}>
                Entry {props.entryId}
            </Link>
        );
    }

    const color = SDK.getEntryTypeColor(refCache.entryTypes[entry.entryType.key]);
    const abbrev = refCache.entryTypes[entry.entryType.key]?.abbreviation ?? "";

    const widget = (
        <span
            className="text-sm font-medium font-sans inline-block"
            style={{
                "--entry-type-color-0": color.backgroundColor,
                "--entry-type-color-1": color.darkerBackgroundColor,
                "--entry-type-color-2": color.textColor,
            } as React.CSSProperties}
        >
            <span className="rounded-l-md py-[2px] min-w-[2em] text-center inline-block bg-entry-type-color-1 text-entry-type-color-2">
                <span className="text-xs inline-block min-w-[1.4em] text-center opacity-40">{abbrev}</span>
            </span>
            <span className="rounded-r-md py-[3px] px-2 bg-gray-50 hover:bg-entry-type-color-0 text-black hover:text-entry-type-color-2">
                {entry.name}
            </span>
        </span>
    );

    if (props.mdtContext.disableInteractiveFeatures) {
        // Links and hover previews are disabled in this context.
        return widget;
    } else if (site.frontendConfig.features?.hoverPreview?.enabled) {
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
                    <Link href={`/entry/${entry.key}`} className="unstyled" {...attribs}>
                        {widget}
                    </Link>
                )}
            </Tooltip>
        );
    } else {
        return (
            <Link href={`/entry/${entry.key}`} className="unstyled">
                {widget}
            </Link>
        );
    }
};
