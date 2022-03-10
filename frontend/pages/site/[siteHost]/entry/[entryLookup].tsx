import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedUrlQuery } from 'querystring';
import { Blurhash } from "react-blurhash";
import { client, api, getSiteData, SiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePageNew';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import { LookupValue } from 'components/LookupValue';
import { EntryLink } from 'components/EntryLink';
//import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    entry: api.EntryData;
    sitePreloaded: api.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryLookup: string;
}

const EntryPage: NextPage<PageProps> = function(props) {

    const mdtContext = React.useMemo(() => new MDTContext({
        entryId: props.entry.id,
        refCache: props.entry.referenceCache,
    }), [props.entry.id]);
    //const user = React.useContext(UserContext);
    const hasProps = props.entry.propertiesSummary?.length ?? 0 > 0;

    return (
        <SitePage
            sitePreloaded={props.sitePreloaded}
            leftNavTopSlot={[
                {id: "entryName", priority: 20, content: <>
                    <h1 className="font-bold text-base">{props.entry.name}</h1>
                    <span id="entry-type-name" className="font-light">{props.entry.entryType.name}</span>
                    <br/>
                </>},
                {id: "entryId", priority: 21, content: <>
                    <code id="entry-id" data-entry-id={props.entry.id} className="font-mono font-light hidden">{props.entry.friendlyId}</code>
                </>},
                {id: "tableOfContents", priority: 50, content: <>
                    <ul id="left-toc-headings" className="font-normal">
                        <li className="my-2 truncate"><a href={`#summary`}><FormattedMessage id="site.entry.summaryLink" defaultMessage="Summary"/></a></li>
                        <li className={`my-2 truncate ${hasProps || "hidden"}`}><a href={`#properties`}><FormattedMessage id="site.entry.propertiesLink" defaultMessage="Properties"/></a></li>
                        {
                            props.entry.features?.Article?.headings.map(heading =>
                                <li key={heading.id} className="my-2 truncate"><a href={`#h-${heading.id}`}>{heading.title}</a></li>
                            )
                        }
                    </ul>
                </>},
            ]}
            title={props.entry.name}
        >
            {/* Hero image, if any */}
            {
                props.entry.features?.HeroImage ?
                    <div className="-m-6 mb-7 relative h-[30vh] md:h-[50vh]">
                        {/* A blurry representation of the image, shown while it is loading: */}
                        <Blurhash
                            hash={props.entry.features.HeroImage.blurHash ?? ""}
                            width="100%"
                            height="100%"
                        />
                        <Image
                            src={props.entry.features.HeroImage.imageUrl}
                            alt=""
                            layout="fill"
                            objectFit={props.entry.features.HeroImage.sizing ?? "contain"}
                        />

                        {props.entry.features.HeroImage.caption ?
                            <div className="absolute bottom-0 right-0 bg-opacity-60 bg-gray-50 text-gray-800 text-xs p-2 max-w-lg backdrop-blur-sm rounded-tl font-light">
                                <EntryLink entryKey={props.entry.features.HeroImage.entryId} mdtContext={mdtContext}>
                                    <FormattedMessage id="site.entry.heroImageCaptionPrefix" defaultMessage="Image:"/>
                                </EntryLink>&nbsp;
                                <InlineMDT mdt={props.entry.features.HeroImage.caption} context={mdtContext} />
                            </div>
                        : null}
                    </div>
                : null
            }

            {/* On mobile devices, some navigation appears here since the left bar / table of contents is hidden */}
            <nav className="md:hidden sticky top-0 -mx-4 py-1 -mt-2 pb-2 -mb-2 bg-white bg-opacity-90 backdrop-blur-sm text-gray-600">
                <ul className="mx-auto text-center">
                    <li className="inline-block p-1 mx-2 text-sm"><a href="#summary">Summary</a></li>
                    <li className={`inline-block p-1 mx-2 text-sm ${hasProps || "hidden"}`}><a href="#properties">Properties</a></li>
                    <li className="inline-block p-1 mx-2 text-sm"><a href="#contents">Contents</a></li>
                    <li className="inline-block p-1 mx-2 text-sm"><a href="#tools">Tools</a></li>
                </ul>
            </nav>

            <h1 id="summary">{props.entry.name}</h1>
            <p id="description"><InlineMDT mdt={props.entry.description ?? ""} context={mdtContext} /></p>

            {/* Properties */}
            <div className={`flex flex-wrap xl:flex-nowrap ${hasProps || "hidden"}`}>
                <div id="properties" className="flex-auto">
                    <h2><FormattedMessage id="site.entry.propertiesHeading" defaultMessage="Properties"/></h2>
                    <table>
                        <tbody>
                            {props.entry.propertiesSummary?.map(p => 
                                <tr key={p.propertyId} className="even:bg-gray-50 hover:bg-blue-50">
                                    <th className="block md:table-cell text-xs md:text-base -mb-1 md:mb-0 pt-1 md:py-1 pr-2 align-top text-left font-normal text-gray-500 md:text-gray-700 min-w-[120px]">
                                        <LookupValue value={{type: "Property", id: p.propertyId}} mdtContext={mdtContext} />
                                    </th>
                                    <td className="block md:table-cell pr-2 pb-1 md:py-1 text-sm md:text-base">
                                        <LookupValue value={p.value} mdtContext={mdtContext} />
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

            <div id="contents">

                {
                    props.entry.features?.Article ?
                        /* Table of contents appears here, but only on mobile */
                        <div className="md:hidden">
                            <h2><FormattedMessage id="site.entry.tableOfContentsHeading" defaultMessage="Contents"/></h2>

                            <ol id="mobile-toc-headings" className="list-decimal list-inside">
                                {
                                    props.entry.features.Article?.headings.map(heading =>
                                        <li key={heading.id} className="my-1 truncate"><a href={`#h-${heading.id}`}>{heading.title}</a></li>
                                    )
                                }
                            </ol>
                        </div>
                    : null
                }

                {
                    props.entry.features?.Image ?
                        <>
                            <h2><FormattedMessage id="site.entry.imageHeading" defaultMessage="Image"/></h2>
                            <img src={props.entry.features.Image.imageUrl} />
                        </>
                    : null
                }

                {/* Article content, if any */}
                {
                    props.entry.features?.Article ?
                        <RenderMDT mdt={props.entry.features.Article.articleMD} context={mdtContext.childContextWith({headingShift: 1})}/>
                    : null
                }
            </div>
        </SitePage>
    );
}

export default EntryPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {

    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params!.siteHost);
    if (site === null) { return {notFound: true}; }
    let entry: api.EntryData;
    try {
        entry = await client.getEntry(context.params!.entryLookup, {siteId: site.shortId, flags: [
            api.GetEntryFlags.IncludePropertiesSummary,
            api.GetEntryFlags.IncludeReferenceCache,
            api.GetEntryFlags.IncludeFeatures,
        ]});
    } catch (err) {
        if (err instanceof api.NotFound) {
            return {notFound: true};
        }
        throw err;
    }

    if (entry.friendlyId !== context.params!.entryLookup) {
        // If the entry was looked up by an old friendlyId or VNID, redirect so the current friendlyId is in the URL:
        return {
            redirect: {
                destination: `/entry/${entry.friendlyId}`,
                permanent: true,
            },
        };
    }

    return {
        props: {
            entry,
            sitePreloaded: site,
        },
    };
}
