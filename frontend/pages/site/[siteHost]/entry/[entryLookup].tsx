import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';
import { client, api, getSiteData, SiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import { LookupValue } from 'components/LookupValue';
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

    const mdtContext = React.useMemo(() => new MDTContext(), [props.entry.id]);
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
                <article id="entry-content" className="w-1/2 bg-white flex-auto p-4 overflow-y-scroll">
                    {/* Hero image, if any */}
                    <div className="-m-4 mb-4 relative">
                        <img src={"/solar-geo-from-nasa-yZygONrUBe8-unsplash.jpg"} alt="" />
                        <div className="absolute bottom-0 right-0 bg-opacity-60 bg-gray-50 text-gray-800 text-xs p-2 max-w-lg backdrop-blur-sm rounded-tl font-light">
                            Image caption here. Lorem ipsum dolor sit amet sinctuir lasdkjfadl skfjsdalk asdlk fjasdlk fsadfhriugher aiundfkjnv lkfd kjsh iuwehvndjkn jdsff askjdlas as.
                        </div>
                    </div>

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
                                        {props.entry.computedFactsSummary?.map(cf => 
                                            <tr key={cf.id}>
                                                <th className="pr-2 align-top text-left font-normal text-gray-700 min-w-[120px]">{cf.label}</th>
                                                <td className="pr-2"><LookupValue value={cf.value} refCache={props.entry.referenceCache} /></td>
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
            api.GetEntryFlags.IncludeComputedFactsSummary,
            api.GetEntryFlags.IncludeReferenceCache,
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


/*



import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths, } from 'next'
import Link from 'next/link';
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring';

import { Page } from 'components/Page';
import { MetadataTable, MetadataEntry } from 'components/techdb/MetadataTable';
import { TRLIndicator, TRL } from 'components/techdb/TRLIndicator';
import { client } from 'lib/api-client';
import { Redirect } from 'components/utils/Redirect';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import {  } from 'neolace-api';
import { urlForShortId } from 'components/utils/urls';

interface PageProps {
    redirectTo: string;
    pageData: {title: string, uuid: string}|null;
}
interface PageUrlQuery extends ParsedUrlQuery {
    entryLookup: string;
}

const TypesSection = "tps";

// This function gets called at build time
export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
      // Which pages (TechDB entries) to pre-generate at build time.
      // This should be set to a list of popular pages.
      paths: [],
      // Enable statically generating any additional pages as needed
      fallback: "blocking",  // https://github.com/vercel/next.js/pull/15672
    }
  }

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    // entryLookup: the part of the URL used to identify this page.
    // For http://www.technotes.org/tech/t-pv-cell-c-si it would be 't-pv-cell-c-si'.
    // It should always be in lower case.
    const key = context.params?.entryLookup || "";
    let pageData: {title: string, uuid: string}|null;
    const redirectTo = '';

    try {
        //const result = await client.getTechConcept({key, flags: [TechDbEntryFlags.numRelatedImages]});
        pageData = await {title: "Test Page", uuid: "123"};
        // if (id !== pageData.id) {
        //     redirectTo = `/db/${id}`;
        // }
    } catch (e) {
        // TODO: only redirect if this was a 404, not 500 etc.
        console.error(e);
        //redirectTo = `/db/quick-search/${key}`;
        pageData = null;
    }

    return {
      props: {
          redirectTo,
          pageData,
      },
    }
}  

const ContentPage: NextPage<PageProps> = function({pageData, ...props}) {
    const mdtContext = React.useMemo(() => new MDTContext(), [pageData?.uuid]);

    if (props.redirectTo) {
        return <Page title="Redirecting...">
            <Redirect to={props.redirectTo} />
        </Page>;
    }
    if (pageData === null) {
        return <p>Data missing.</p>;
    }

    return <Page title={pageData.title}>

        {/* Hero image * /}
        <div className="row mt-n2 mt-md-n3 mb-2 mb-md-3">
            <div className="col col-12">
                <div className="tn-full-width-hero">
                    <img src={/*pageData.heroImage?.imageUrl ?? * /"/solar-geo-from-nasa-yZygONrUBe8-unsplash.jpg"} alt="" />
                </div>
            </div>
        </div>
{/*
        <div className="row">
            <div className="col col-12">

                <h1>{pageData.name}</h1>

                <p><InlineMDT mdt={pageData.description} context={mdtContext} /></p>
            </div>
        </div>

        <MetadataTable>
            {pageData.altNames.length > 0 &&
                <MetadataEntry label="Also known as">
                    <ul>
                        {pageData.altNames.map((altName) => <li key={altName}>{altName}</li>)}
                    </ul>
                </MetadataEntry>
            }
            <MetadataEntry label="Readiness Level"><TRLIndicator trl={TRL(pageData.readinessLevel ?? "")} /></MetadataEntry>
            {pageData.isA.length > 0 &&
                <MetadataEntry label="Type of">
                    <ul>
                        {pageData.isA.map(parent =>
                            <li key={parent.shortId}><Link href={`/tech/${parent.shortId}`}><a>{parent.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.types.length > 0 &&
                <MetadataEntry label="Types">
                    <ul>
                        {pageData.types.map(child =>
                            <li key={child.shortId}><Link href={`/tech/${child.shortId}`}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.usedIn.length > 0 &&
                <MetadataEntry label="Used in">
                    <ul>
                        {pageData.usedIn.map(child =>
                            <li key={child.shortId}><Link href={`/tech/${child.shortId}`}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.designs.length > 0 &&
                <MetadataEntry label="Designs">
                    <ul>
                        {pageData.designs.map(child =>
                            <li key={child.shortId}><Link href={urlForShortId(child.shortId)}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {/ *
            <MetadataEntry label="Activity">
                📈<Link href="#"><a>120 published updates</a></Link>, 📉 <Link href="#"><a>1 patent filed</a></Link> (past year)
            </MetadataEntry>
            * /}
            <MetadataEntry label="Library Resources">
                {
                    (pageData.numRelatedImages || 0) > 0 ?
                        <Link href={`/library/images/related/${pageData.shortId}`}><a>{pageData.numRelatedImages} images</a></Link>
                    :
                        "No related images"
                }
            </MetadataEntry>
        </MetadataTable>
        * /}
        {
            /*pageData.articleSections.map(section => {
                const autoContent = (
                    section.code === TypesSection && pageData.types.length > 0 ?
                        pageData.types.map(child =>
                            <TechnologyTemp id={child.shortId} key={child.shortId} title={child.name} trl={TRL(child.readinessLevel ?? "")}>
                                <InlineMDT mdt={child.description} context={mdtContext} />
                            </TechnologyTemp>
                        )
                    :
                        null
                );

                return section.content || autoContent ?
                    <div className="row" key={section.code}>
                        <div className="col col-12">
                            <h2 id={section.code}>{section.title}</h2>
                            <RenderMDT mdt={section.content} context={mdtContext} />

                            {autoContent}
                        </div>
                    </div>
                : null;
            })* /
        }
    </Page>;
}


const TechnologyTemp: React.FunctionComponent<{title: string, trl: TRL, id: string}> = (props) => {
    return <div style={{border: '1px solid #343a40', marginLeft: "0.5em", marginTop: "1em", marginBottom: "0.5em"}}>
        <div style={{backgroundColor: '#343a40', width: "350px", color: 'white', fontSize: "20px", marginLeft: "-0.5em", marginTop: "-0.5em", height: "30px"}}>
            <span style={{padding: "5px"}}><Link href={`/tech/${props.id}`}><a style={{color: 'white', textDecoration: 'none'}}>{props.title}</a></Link></span>
            <div style={{display: "inline-block", float: "right"}}>
                <TRLIndicator trl={props.trl} small />
            </div>
        </div>
        <div style={{padding: "8px"}}>
            {props.children}
        </div>
    </div>;
};
*/
