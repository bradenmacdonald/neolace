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
import { FormattedMessage, useIntl } from "react-intl";
import Link from "next/link";
import Image from "next/image";
import { Blurhash } from "react-blurhash";
import { SDK, RefCacheContext, useEntry, usePermission } from "lib/sdk";

import { SitePage } from "components/SitePage";
import { InlineMDT, MDTContext, RenderMDT } from "components/markdown-mdt/mdt";
import { LookupValue } from "components/widgets/LookupValue";
import { EntryLink } from "components/widgets/EntryLink";
import { imgThumbnailLoader } from "lib/config";
import { ErrorMessage } from "./widgets/ErrorMessage";
import { defineMessage, noTranslationNeeded } from "./utils/i18n";
import { Spinner } from "./widgets/Spinner";
import { UISlot, UISlotWidget } from "./widgets/UISlot";
import Head from "next/head";
import { LeftPanelLinkSet } from "./widgets/LeftPanelLinkSet";
import { StickyHeader } from "./widgets/StickyHeader";

interface Props {
    /** The entry key (either its key or VNID) */
    entrykey: SDK.VNID | string;
    /** The entry, as visible to the public (to a user with no permissions) */
    publicEntry?: SDK.EntryData;
}

/**
 * The actual entry page, seen when viewing an entry, e.g. at /entry/foo
 *
 * This is in components/ rather than pages for a few reasons:
 * (1) We will be adding a "preview entry" page that loads the data differently but still needs to look exactly the
 *     same, which means we'll be re-using this code for multiple pages.
 *     That is, both /entry/foo and /draft/1/preview/entry/foo will use this same page, but one is showing the currently
 *     published version of the entry, and the other is showing a preview of draft changes.
 * (2) The code gets a bit messier and more indented if this is all put into
 *     pages/site/[siteHost]/entry/[entryLookup]/index.tsx
 *     So we want this "inner" part to be in a separate file. BUT it is not permitted to put components (partial pages)
 *     in the pages/ directory - see https://github.com/vercel/next.js/issues/8454 . So this has to be in the
 *     components/directory.
 * (3) We'll have a much better approach for this in the near future: https://nextjs.org/blog/layouts-rfc
 */
export const EntryPage: React.FunctionComponent<Props> = function (props) {
    const [entry, entryError] = useEntry(props.entrykey, props.publicEntry);
    const intl = useIntl();
    const canProposeEdits = usePermission(SDK.CorePerm.proposeEditToEntry, { entryId: entry?.id });

    const mdtContext = React.useMemo(() => new MDTContext({ entryId: entry?.id }), [entry?.id]);

    if (entryError) {
        if (entryError instanceof SDK.NotAuthorized) {
            return (
                <SitePage title={defineMessage({ defaultMessage: "Not Authorized", id: "ZY2CvS" })}>
                    <ErrorMessage>
                        <FormattedMessage defaultMessage="You don't have permission to view this entry." id="mSFck0" />
                    </ErrorMessage>
                </SitePage>
            );
        } else if (entryError instanceof SDK.NotAuthenticated) {
            return (
                <SitePage title={defineMessage({ defaultMessage: "Login required", id: "5ZX5lS" })}>
                    <ErrorMessage>
                        <FormattedMessage
                            defaultMessage="You need to log in before you can view this entry."
                            id="xEuD2+"
                        />
                    </ErrorMessage>
                </SitePage>
            );
        } else {
            return (
                <SitePage title={defineMessage({ defaultMessage: "Error", id: "KN7zKn" })}>
                    <ErrorMessage>
                        <FormattedMessage defaultMessage="An error occurred while loading this entry." id="3pC0DV" />
                    </ErrorMessage>
                </SitePage>
            );
        }
    } else if (entry === undefined) {
        // The public doesn't have permission to view this entry, but the current user might. Display a spinner while loading...
        return (
            <SitePage title={defineMessage({ defaultMessage: "Loading", id: "iFsDVR" })}>
                <Spinner />
            </SitePage>
        );
    }

    //const hasProps = entry.propertiesSummary?.length ?? 0 > 0;

    return (
        <RefCacheContext.Provider value={{refCache: entry.referenceCache}}>
            <SitePage
                // The name of this entry is the <title> of the page
                title={entry.name}

                leftNavTopSlot={[
                    // These are the links to each heading in the entry's article, if any, as well as to the summary and properties at the top:
                    {
                        id: "tableOfContents",
                        priority: 50,
                        content: <LeftPanelLinkSet
                            label={defineMessage({defaultMessage: "On this page", id: "TM7OHi"})}
                            links={[
                                {
                                    id: "summary",
                                    priority: 10,
                                    content: {
                                        label: <FormattedMessage defaultMessage="Summary" id="RrCui3" />,
                                        url: `/entry/${entry.key}#summary`,
                                    },
                                },
                                ...(
                                    entry.features?.Article?.headings.map((heading, idx) => ({
                                        id: `h-link-${heading.id}`,
                                        priority: 50 + idx,
                                        content: {
                                            label: <>{heading.title}</>,
                                            url: `/entry/${entry.key}#h-${heading.id}`,
                                        },
                                    })) ?? []
                                )
                            ]}
                            slotId="table-of-contents"
                            hasIcons={false}
                            showLabel
                        />,
                        hidden: (entry.features?.Article?.headings?.length ?? 0) < 1
                    },
                    // Action links, e.g. to edit this entry, view change history, etc.
                    // {id: "entryActions", priority: 60, content: <>
                    //     <ul id="entry-actions" className="mt-4">
                    //         {canProposeEdits ? <li><Link href={`/draft/_/entry/${entry.id}/edit`}><FormattedMessage id="wEQDC6" defaultMessage="Edit"/></Link></li> : null }
                    //     </ul>
                    // </>},
                ]}
            >
                {/* Hero image, if any */}
                {
                    entry.features?.HeroImage ?
                        <div className="-m-6 mb-6 relative h-[30vh] md:h-[50vh]" style={(
                            /*
                                If the image is landscape (significantly wider than it is tall), make it as wide as the page and adjust the height to match.
                                Otherwise (if square-ish or vertical), use a fixed aspect ratio container and either display the image centered or stretch the
                                image to "cover" the area, depending on the image contents.
                            */
                            (entry.features.HeroImage.width && entry.features.HeroImage.height && (entry.features.HeroImage.width > entry.features.HeroImage.height * 1.4))
                                ? {aspectRatio: `${entry.features.HeroImage.width} / ${entry.features.HeroImage.height}`, height: "auto", minHeight: "20vh" /* for old safari that doesn't support aspect-ratio */}
                                : {}
                        )}>
                            {/* A blurry representation of the hero image, shown while it is loading: */}
                            <Blurhash
                                hash={entry.features.HeroImage.blurHash ?? ""}
                                width="100%"
                                height="100%"
                            />
                            {/*
                                The hero image. Depending on the content of the image, we crop it using "cover" or shrink it
                                proportionally to fit, using "contain".
                                * Photos with the subject in the center with lots of space around it are ideal for "cover";
                                it's fine to crop out parts of them to make the image fit.
                                * Images where the subject almost touches all four sides and seeing the whole thing without
                                cropping is important - those need to use "contain".

                                If the image is significantly wider than it is tall, it doesn't matter - we adjust the
                                height to fit exactly anyways (see above).
                            */}
                            <Image
                                key={
                                    entry.features.HeroImage.entryId
                                    /* ^ Use this key to force the BlurHash to appear when we navigate, while the new
                                    image loads; otherwise it shows the previous image which is confusing.
                                */}
                                src={entry.features.HeroImage.imageUrl}
                                loader={imgThumbnailLoader}
                                alt=""
                                fill
                                className={`${entry.features.HeroImage.sizing === SDK.ImageSizingMode.Contain ? "object-contain" : "object-cover"}`}
                                sizes="1000px"
                                priority
                            />

                            {/* Display the caption, if any, at the bottom right of the hero image. */}
                            {entry.features.HeroImage.caption ?
                                <div className="absolute bottom-0 right-0 bg-opacity-60 bg-gray-50 text-gray-800 text-xs p-2 max-w-lg backdrop-blur-sm rounded-tl font-light">
                                    <EntryLink entryKey={entry.features.HeroImage.entryId} mdtContext={mdtContext}>
                                        <FormattedMessage id="lr4lXN" defaultMessage="Image:"/>
                                    </EntryLink>&nbsp;
                                    <InlineMDT mdt={entry.features.HeroImage.caption} context={mdtContext} />
                                </div>
                            : null}
                        </div>
                    : null
                }

                {/* Header: The entry title, and action links. This "sticks" to the top of the page. */}
                <StickyHeader
                    title={noTranslationNeeded(entry.name)}
                    rightActions={
                        <UISlot<{label: React.ReactElement, url: string}>
                            slotId="entryActions"
                            defaultContents={[
                                ...(
                                    canProposeEdits ? [
                                        {
                                            id: "edit-entry",
                                            priority: 10,
                                            content: {
                                                label: <FormattedMessage defaultMessage="Edit" id="wEQDC6" />,
                                                url: `/draft/_/entry/${entry.id}/edit`,
                                            },
                                        },
                                    ]: []
                                ),
                                // {
                                //     id: "entry-history",
                                //     priority: 20,
                                //     content: {
                                //         label: <FormattedMessage defaultMessage="History" id="djJp6c" />,
                                //         url: `/entry/${entry.id}/history`,
                                //     },
                                // },
                            ]}
                            renderWidget={
                                (link: UISlotWidget<{label: React.ReactElement, url: string}>) => (
                                    <Link href={link.content.url} key={link.id} className="rounded-md block px-2 py-2 hover:bg-slate-200 !text-slate-500 hover:text-black !no-underline">
                                        {link.content.label}
                                    </Link>
                                )
                            }
                        />
                    }
                />

                {/* Summary - Description and Properties */}
                <div id="summary" className="flex" data-entry-id={entry.id}>
                    <div id="properties" className="flex-auto">
                        <table className="w-full table-fixed">
                            <colgroup>
                                <col className="w-full md:w-1/4 lg:w-1/6" />
                                <col/>
                            </colgroup>
                            <tbody>
                                {entry.description ?
                                    <tr className="even:bg-[#fbfbfe] group">
                                        {/* The property (e.g. "Population") */}
                                        <th className="block md:table-cell text-xs md:text-sm pt-1 md:py-1 pr-2 align-top text-left font-normal text-gray-500 group-hover:text-gray-800 min-w-[120px]">
                                            <FormattedMessage defaultMessage="Description" id="Q8Qw5B"/>
                                        </th>
                                        {/* The property value (e.g. "38 million people") */}
                                        <td className="block md:table-cell pr-2 pb-1">
                                            <InlineMDT mdt={entry.description} context={mdtContext} />
                                        </td>
                                    </tr>
                                : null}
                                {entry.propertiesSummary?.map(p => 
                                    <tr className="even:bg-[#fbfbfe] group" key={p.propertyKey}>
                                        {/* The property (e.g. "Population") */}
                                        <th className="block md:table-cell text-xs md:text-sm pt-1 md:py-1 pr-2 align-top text-left font-normal text-gray-500 group-hover:text-gray-800 min-w-[120px]">
                                            <LookupValue value={{type: "Property", key: p.propertyKey}} mdtContext={mdtContext} />
                                        </th>
                                        {/* The property value (e.g. "38 million people") */}
                                        <td className="block md:table-cell pr-2 py-1">
                                            <LookupValue value={p.value} mdtContext={mdtContext} defaultListMode="compact" />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/*
                    // In an earlier design, we always displayed a graph here. Currently we don't do that, and a graph will
                    // only be displayed if explicitly added to the entry type as a "property" - see technotes.org for an
                    // example of this.
                    <div id="graph-thumbnail" className="hidden md:block flex-initial">
                        <h2><FormattedMessage id="site.entry.graphHeading" defaultMessage="Explore Graph"/></h2>
                        <div className="bg-gray-200 pb-[50%] text-center">(graph)</div>
                    </div>
                    */}
                </div>

                <div id="entry-contents">

                    {/*
                        Before the content of the entry, here is a slot that allows plugins to display additional content or
                        UI widgets. By default, there is nothing here and thus is is not visible.
                        We use 'cloneElement' in order to pass 'entry' as a prop to the plugin widgets; but in the future we
                        may have a nicer way to do this using EntryContext/<EntryContext.Provider>.
                    */}
                    <UISlot slotId="entryPreFeature" defaultContents={[]} renderWidget={(w) => React.cloneElement(w.content, { key: w.id, entry, })} />

                    {/*
                        If this _is_ an image entry (this entry has the "image" feature), display the image here.
                        This is different than the "hero image" above, which is not the main content of the entry, but just
                        an image displayed with the entry to make it look nicer.

                        Typically an entry is either an image entry or an article entry (or neither), but not both. However,
                        it _could_ have both if there was a use case for that, so we do allow that option.
                    */}
                    {
                        entry.features?.Image ?
                            <>
                                <h2><FormattedMessage id="+0zv6g" defaultMessage="Image"/></h2>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={entry.features.Image.imageUrl}
                                    alt={intl.formatMessage({defaultMessage: 'The image attached to this entry.', id: 'RuO3eW'})}
                                />
                            </>
                        : null
                    }

                    {/* Article content, if any */}
                    {
                        entry.features?.Article ?
                            <RenderMDT 
                                // The Markdown (MDT) of this article
                                mdt={entry.features.Article.articleContent}
                                // The page already has an <h1> (the entry title, above), so we "shift" all headings in
                                // the markdown so that the first heading in the markdown will be rendered here as an <h2>.
                                // This is because each HTML page should only have one <h1> heading.
                                context={mdtContext.childContextWith({headingShift: 1})}
                            />
                        : null
                    }
                </div>

                <div id="entry-end">
                    {/*
                        After the content of the entry, here is a slot that allows plugins to display additional content or
                        UI widgets. By default, there is nothing here and thus is is not visible.
                        We use 'cloneElement' in order to pass 'entry' as a prop to the plugin widgets; but in the future we
                        may have a nicer way to do this using EntryContext/<EntryContext.Provider>.
                    */}
                    <UISlot slotId="entryAfterContent" defaultContents={[]} renderWidget={(w) => React.cloneElement(w.content, { key: w.id, entry, })} />
                </div>
            </SitePage>
        </RefCacheContext.Provider>
    );
}
