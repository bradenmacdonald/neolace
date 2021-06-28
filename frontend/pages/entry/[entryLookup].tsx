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

        {/* Hero image */}
        <div className="row mt-n2 mt-md-n3 mb-2 mb-md-3">
            <div className="col col-12">
                <div className="tn-full-width-hero">
                    <img src={/*pageData.heroImage?.imageUrl ?? */"/solar-geo-from-nasa-yZygONrUBe8-unsplash.jpg"} alt="" />
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
        */}
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
            })*/
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

export default ContentPage;
