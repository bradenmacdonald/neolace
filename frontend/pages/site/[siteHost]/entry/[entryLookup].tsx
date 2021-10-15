import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ParsedUrlQuery } from 'querystring';
import { client, api, getSiteData, SiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import { LookupValue } from 'components/LookupValue';
import { EntryLink } from 'components/EntryLink';
//import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    site: SiteData;
    entry: api.EntryData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryLookup: string;
}

const EntryPage: NextPage<PageProps> = function(props) {

    const mdtContext = React.useMemo(() => new MDTContext({
        refCache: props.entry.referenceCache,
    }), [props.entry.id]);
    //const user = React.useContext(UserContext);

    return (
        <SitePage
            title={`${props.entry.name} - ${props.site.name}`}
            site={props.site}
        >

            <div className="absolute top-0 bottom-0 left-0 right-0 bg-yellow-300 flex flex-row">

                {/* Left column, which shows table of contents, but only on desktop */}
                <div id="left-toc-col" className="hidden md:block w-1/4 max-w-xs bg-gray-200 flex-initial border-gray-300 border-r p-4 overflow-y-scroll">
                    <h1 className="font-bold text-base">{props.entry.name}</h1>
                    <span id="entry-type-name" className="font-light">{props.entry.entryType.name}</span>
                    <br/><br/>
                    <code id="entry-id" data-entry-id={props.entry.id} className="font-mono font-light">{props.entry.friendlyId}</code>
                </div>

                {/* The main content of this entry */}
                <article id="entry-content" className="w-1/2 bg-white flex-auto p-4 overflow-y-scroll z-0">{/* We have z-0 here because without it, the scrollbars appear behind the image+caption elements. */}
                    {/* Hero image, if any */}
                    {
                        props.entry.features?.HeroImage ?
                            <div className="-m-4 mb-4 relative h-[50vh]">
                                <Image
                                    src={props.entry.features.HeroImage.imageUrl}
                                    alt=""
                                    layout="fill"
                                    objectFit="cover"
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
                    <nav className="md:hidden sticky -top-4 -mx-4 py-1 -mt-2 pb-2 -mb-2 bg-white bg-opacity-90 backdrop-blur-sm text-gray-600">
                        <ul className="mx-auto text-center">
                            <li className="inline-block p-1 mx-2 text-sm"><a href="#summary">Summary</a></li>
                            <li className="inline-block p-1 mx-2 text-sm"><a href="#properties">Properties</a></li>
                            <li className="inline-block p-1 mx-2 text-sm"><a href="#contents">Contents</a></li>
                            <li className="inline-block p-1 mx-2 text-sm"><a href="#tools">Tools</a></li>
                        </ul>
                    </nav>

                    <div className="neo-typography">

                        <h1 id="summary">{props.entry.name}</h1>
                        <p id="description"><InlineMDT mdt={props.entry.description} context={mdtContext} /></p>

                        <div className="flex flex-wrap xl:flex-nowrap">
                            <div id="properties" className="flex-auto min-w-[400px]">
                                <h2><FormattedMessage id="site.entry.propertiesHeading" defaultMessage="Properties"/></h2>
                                <table>
                                    <tbody>
                                        {props.entry.propertiesSummary?.map(propValue => 
                                            <tr key={propValue.id}>
                                                <th className="pr-2 align-top text-left font-normal text-gray-700 min-w-[120px]">{
                                                    propValue.type === "PropertyValue" ?
                                                        <LookupValue value={{type: "Entry", id: propValue.id}} refCache={props.entry.referenceCache} mdtContext={mdtContext} />
                                                    :
                                                        propValue.label
                                                }</th>
                                                <td className="pr-2"><LookupValue value={propValue.value} refCache={props.entry.referenceCache} mdtContext={mdtContext} /></td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div id="graph-thumbnail" className="hidden md:block flex-initial min-w-[400px]">
                                <h2><FormattedMessage id="site.entry.graphHeading" defaultMessage="Explore Graph"/></h2>
                                <div className="bg-gray-200 pb-[50%] text-center">(graph)</div>
                            </div>
                        </div>

                        {
                            props.entry.features?.Image ?
                                <>
                                    <h2><FormattedMessage id="site.entry.imageHeading" defaultMessage="Image"/></h2>
                                    <img src={props.entry.features.Image.imageUrl} />
                                </>
                            : null
                        }

                        {/* Article content, if any */}
                        <h2>Heading 2</h2>
                        <p>Is it my imagination, or have tempers become a little frayed on the ship lately? I think you've let your personal feelings cloud your judgement. Now, how the hell do we defeat an enemy that knows us better than we know ourselves? Your head is not an artifact! Fear is the true enemy, the only enemy. Mr. Worf, you sound like a man who's asking his friend if he can start dating his sister.</p>
                        <p>Travel time to the nearest starbase? My oath is between Captain Kargan and myself. Your only concern is with how you obey my orders. Or do you prefer the rank of prisoner to that of lieutenant?</p>
                        <p>Not if I weaken first. Computer, lights up! Wouldn't that bring about chaos? Is it my imagination, or have tempers become a little frayed on the ship lately? Fear is the true enemy, the only enemy. Yesterday I did not know how to eat gagh. For an android with no feelings, he sure managed to evoke them in others. This should be interesting. We have a saboteur aboard. Our neural pathways have become accustomed to your sensory input patterns. Sure. You'd be surprised how far a hug goes with Geordi, or Worf.</p>
                        <h3>Heading 3</h3>
                        <p>I can't. As much as I care about you, my first duty is to the ship.</p>
                        <h4>Heading 4</h4>
                        <p>Well, that's certainly good to know.</p>
                        <h5>Heading 5</h5>
                        <p>But the probability of making a six is no greater than that of rolling a seven. And blowing into maximum warp speed, you appeared for an instant to be in two places at once.</p>
                    </div>
                </article>
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
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }
    let entry: api.EntryData;
    try {
        entry = await client.getEntry(context.params.entryLookup, {siteId: site.shortId, flags: [
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

    if (entry.friendlyId !== context.params.entryLookup) {
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
            site,
            entry,
        },
    };
}
