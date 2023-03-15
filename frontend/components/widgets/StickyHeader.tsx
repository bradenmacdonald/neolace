/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { displayText, TranslatableText } from "components/utils/i18n";
import { useResizeObserver } from "lib/hooks/useResizeObserver";
import { IncreaseZIndex, useZIndex, ZIndexContext } from "lib/hooks/useZIndex";
import Head from "next/head";
import React from "react";

interface Props {
    title: TranslatableText;
    /** Optional: widgets to display on the right hand side, like an "Edit" button on an entry page. */
    rightActions?: React.ReactNode;
}

/**
 * A header at the top of the page, that will become "sticky" at the top as the user scrolls past it.
 */
export const StickyHeader: React.FunctionComponent<Props> = (props: Props) => {
    const zIndex = useZIndex({increaseBy: IncreaseZIndex.ForPanel});
    const div = React.useRef<HTMLDivElement>(null);

    /**
     * When using "rightActions", we need to use JS to apply some padding to the <H1>, so that it doesn't overlap with
     * the actions. This is how much padding we need in pixels, if any.
     */
    const [h1RightPadding, setH1RightPadding] = React.useState(0);
    const rightActionsDiv = React.useRef<HTMLDivElement>(null);
    const handleActionsDivSizeChange = React.useCallback(() => {
        // The new offset is the width of the "rightActions" plus 5px, or just 0px if there are no right actions.
        setH1RightPadding((rightActionsDiv.current?.offsetWidth ?? -5) + 5);
    }, []);
    useResizeObserver(rightActionsDiv.current, handleActionsDivSizeChange);

    /**
     * If a page has a particularly long title that takes two lines to render, we need to adjust the scroll offset so
     * that #anchor links still scroll to the correct height.
     */
    const handleStickyHeaderSizeChange = React.useCallback(() => {
        (document.querySelector(':root') as HTMLElement)?.style.setProperty(
            "--sticky-header-offset",
            `${div.current?.offsetHeight}px`,
        );
    }, []);
    useResizeObserver(div.current, handleStickyHeaderSizeChange);

    return (
        <div ref={div} className="-m-6 mb-6 px-6 pt-6 pb-6 sticky top-[var(--global-header-offset,0px)] bg-white bg-opacity-90 backdrop-blur-md border-b border-gray-50" style={{zIndex}}>
            <Head>
                {/* Adjust the scroll padding so that #anchor links work correctly: */}
                <style>{`
                    html { scroll-padding-top: calc( var(--global-header-offset,0px) + var(--sticky-header-offset,85px) ); }
                `}</style>
            </Head>
            <ZIndexContext.Provider value={zIndex}>
                {/* This heading is "inline" with padding at the end to ensure it never overlaps with the actions like "Edit" */}
                <h1 className="inline" style={{paddingRight: `${h1RightPadding}px`}}>{displayText(props.title)}</h1>
                {
                    props.rightActions ?
                        <div ref={rightActionsDiv} className="absolute right-2 bottom-0 flex border-slate-200 space-x-2">
                            {props.rightActions}
                        </div>
                    : null
                }
            </ZIndexContext.Provider>
        </div>
    );
};
