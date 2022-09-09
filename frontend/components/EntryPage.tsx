import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import Link from "next/link";
import Image from "next/future/image";
import { Blurhash } from "react-blurhash";
import { api, useEntry } from "lib/api";

import { SitePage } from "components/SitePage";
import { InlineMDT, MDTContext, RenderMDT } from "components/markdown-mdt/mdt";
import { LookupValue } from "components/LookupValue";
import { EntryLink } from "components/EntryLink";
import { DEVELOPMENT_MODE, imgThumbnailLoader } from "lib/config";
import { ErrorMessage } from "./widgets/ErrorMessage";
import { defineMessage } from "./utils/i18n";
import { Spinner } from "./widgets/Spinner";
import { UISlot } from "./widgets/UISlot";

interface Props {
    /** The entry key (either its friendlyId or VNID) */
    entrykey: api.VNID | string;
    /** The entry, as visible to the public (to a user with no permissions) */
    publicEntry?: api.EntryData;
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

    // When the entry page loads, it uses SWR to fetch the latest/user-specific version of the entry from the server,
    // though in most cases it will be the same. To avoid re-rendering the whole React tree, we need to use
    // JSON.stringify to compare the reference cache by value.
    const mdtContext = React.useMemo(() => new MDTContext({
        entryId: entry?.id,
        refCache: entry?.referenceCache,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [entry?.id, JSON.stringify(entry?.referenceCache ?? "")]);

    if (entryError) {
        if (entryError instanceof api.NotAuthorized) {
            return (
                <SitePage title={defineMessage({ defaultMessage: "Not Authorized", id: "ZY2CvS" })}>
                    <ErrorMessage>
                        <FormattedMessage defaultMessage="You don't have permission to view this entry." id="mSFck0" />
                    </ErrorMessage>
                </SitePage>
            );
        } else if (entryError instanceof api.NotAuthenticated) {
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

    const hasProps = entry.propertiesSummary?.length ?? 0 > 0;

    return (
        <SitePage
            leftNavTopSlot={[
                {id: "entryName", priority: 20, content: <>
                    <strong className="block mt-2">{entry.name}</strong>
                </>},
                {id: "entryId", priority: 21, content: <>
                    <code id="entry-id" data-entry-id={entry.id} className="font-mono font-light hidden">{entry.friendlyId}</code>
                </>},
                {id: "tableOfContents", priority: 50, content: <>
                    <ul id="left-toc-headings">
                        <li><Link href={`/entry/${entry.friendlyId}#summary`}><FormattedMessage id="RrCui3" defaultMessage="Summary"/></Link></li>
                        <li className={`${hasProps || "hidden"}`}><Link href={`/entry/${entry.friendlyId}#properties`}><FormattedMessage id="aI80kg" defaultMessage="Properties"/></Link></li>
                        {
                            entry.features?.Article?.headings.map(heading =>
                                <li key={heading.id}><Link href={`/entry/${entry.friendlyId}#h-${heading.id}`}>{heading.title}</Link></li>
                            )
                        }
                    </ul>
                </>},
                ...(DEVELOPMENT_MODE ? [
                    {id: "entryActions", priority: 60, content: <>
                    <ul id="entry-actions" className="mt-4">
                        <li><Link href={`/draft/_/entry/${entry.id}/edit`}><FormattedMessage id="wEQDC6" defaultMessage="Edit"/></Link></li>
                    </ul>
                </>},
                ] : [])
            ]}
            title={entry.name}
        >
            {/* Hero image, if any */}
            {
                entry.features?.HeroImage ?
                    <div className="-m-6 mb-7 relative h-[30vh] md:h-[50vh]" style={(
                        /*
                            If the image is landscape (significantly wider than it is tall), make it as wide as the page and adjust the height to match.
                            Otherwise (if square-ish or vertical), use a fixed aspect ratio container and either display the image centered or stretch the
                            image to "cover" the area, depending on the image contents.
                        */
                        (entry.features.HeroImage.width && entry.features.HeroImage.height && (entry.features.HeroImage.width > entry.features.HeroImage.height * 1.4))
                            ? {aspectRatio: `${entry.features.HeroImage.width} / ${entry.features.HeroImage.height}`, height: "auto", minHeight: "20vh" /* for old safari that doesn't support aspect-ratio */}
                            : {}
                    )}>
                        {/* A blurry representation of the image, shown while it is loading: */}
                        <Blurhash
                            hash={entry.features.HeroImage.blurHash ?? ""}
                            width="100%"
                            height="100%"
                        />
                        <Image
                            src={entry.features.HeroImage.imageUrl}
                            loader={imgThumbnailLoader}
                            alt=""
                            fill
                            className={`${entry.features.HeroImage.sizing === api.ImageSizingMode.Contain ? "object-contain" : "object-cover"}`}
                            sizes="1000px"
                            priority
                        />

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

            <h1 id="summary">{entry.name}</h1>
            <p id="description"><InlineMDT mdt={entry.description ?? ""} context={mdtContext} /></p>

            {/* Properties */}
            <div className={`flex flex-wrap xl:flex-nowrap ${hasProps || "hidden"}`}>
                <div id="properties" className="flex-auto">
                    <h2><FormattedMessage id="aI80kg" defaultMessage="Properties"/></h2>
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col className="w-full md:w-1/4" />
                            <col/>
                        </colgroup>
                        <tbody>
                            {entry.propertiesSummary?.map(p => 
                                <tr key={p.propertyId} className="even:bg-[#fbfbfe]">
                                    <th className="block md:table-cell text-xs md:text-base -mb-1 md:mb-0 pt-1 md:py-1 pr-2 align-top text-left font-normal text-gray-500 md:text-gray-700 min-w-[120px]">
                                        <LookupValue value={{type: "Property", id: p.propertyId}} mdtContext={mdtContext} />
                                    </th>
                                    <td className="block md:table-cell pr-2 pb-1 md:py-1 text-sm md:text-base">
                                        <LookupValue value={p.value} mdtContext={mdtContext} defaultListMode="compact" />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/*
                <div id="graph-thumbnail" className="hidden md:block flex-initial">
                    <h2><FormattedMessage id="site.entry.graphHeading" defaultMessage="Explore Graph"/></h2>
                    <div className="bg-gray-200 pb-[50%] text-center">(graph)</div>
                </div>
                */}
            </div>

            <div id="entry-contents">
                
                <UISlot slotId="entryPreFeature" defaultContents={[]} renderWidget={(w) => React.cloneElement(w.content, { key: w.id, entry, })} />

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
                        <RenderMDT mdt={entry.features.Article.articleMD} context={mdtContext.childContextWith({headingShift: 1})}/>
                    : null
                }
            </div>

            <div id="entry-end">
                <UISlot slotId="entryAfterContent" defaultContents={[]} renderWidget={(w) => React.cloneElement(w.content, { key: w.id, entry, })} />
            </div>
        </SitePage>
    );
}
