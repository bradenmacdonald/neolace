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
import { ProcessData } from 'technotes-api';
import { InlineMDT, MDTContext } from 'components/markdown-mdt/mdt';

interface PageProps {
    redirectTo: string;
    pageData: ProcessData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    entryLookup: string;
}

// This function gets called at build time
export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return {
      // Which pages (TechDB entries) to pre-generate at build time.
      // This should be set to a list of popular pages.
      paths: [],
      // Enable statically generating any additional pages as needed
      fallback: "blocking",  // https://github.com/vercel/next.js/pull/15672
    }
  }

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    // entryLookup: the part of the URL used to identify this page.
    // For http://www.technotes.org/process/t-pv-cell-c-si it would be 't-pv-cell-c-si'.
    // It should always be in lower case.
    let key = context.params.entryLookup;
    let pageData: ProcessData;
    let redirectTo: string = '';

    try {
        const result = await client.getProcess({key});
        pageData = result;
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
    const router = useRouter()

    return <Page title={pageData.name}>

        {/* Hero image */}
        <div className="row mt-n2 mt-md-n3 mb-2 mb-md-3">
            <div className="col col-12">
                <div className="tn-full-width-hero">
                    <img src="/solar-geo-from-nasa-yZygONrUBe8-unsplash.jpg" alt="" />
                </div>
            </div>
        </div>

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
            <MetadataEntry label="Readiness Level"><TRLIndicator trl={TRL(pageData.readinessLevel)} /></MetadataEntry>
            {pageData.isA.length > 0 &&
                <MetadataEntry label="Type of">
                    <ul>
                        {pageData.isA.map(parent =>
                            <li key={parent.shortId}><Link href={`/process/${parent.shortId}`}><a>{parent.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.types.length > 0 &&
                <MetadataEntry label="Types">
                    <ul>
                        {pageData.types.map(child =>
                            <li key={child.shortId}><Link href={`/process/${child.shortId}`}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {/*
            <MetadataEntry label="Activity">
                📈<Link href="#"><a>120 published updates</a></Link>, 📉 <Link href="#"><a>1 patent filed</a></Link> (past year)
            </MetadataEntry>
            <MetadataEntry label="Library Resources">
                <Link href="#"><a>241 documents</a></Link>, <Link href="#"><a>23 datasets</a></Link>
            </MetadataEntry>
            <MetadataEntry label="Article Editor">
                <Link href="#"><a>Joel Krupa (joel)</a></Link> + <Link href="#"><a>3 contributors</a></Link>. Geoengineering topics editor: <Link href="#"><a>Alex Barnsmith (barnsmith)</a></Link>
            </MetadataEntry>
            */}
        </MetadataTable>

        <div className="row">
            <div className="col col-12">

                {pageData.types.length > 0 && <>
                    <h2>Types</h2>
                    {pageData.types.map(child =>
                        <TechnologyTemp id={child.shortId} key={child.shortId} title={child.name} trl={TRL(child.readinessLevel)}>
                            <InlineMDT mdt={child.description} context={mdtContext} />
                        </TechnologyTemp>
                    )}
                </>}
            </div>
        </div>
    </Page>;
}


const TechnologyTemp: React.FunctionComponent<{title: string, trl: TRL, id: string}> = (props) => {
    return <div style={{border: '1px solid #343a40', marginLeft: "0.5em", marginTop: "1em", marginBottom: "0.5em"}}>
        <div style={{backgroundColor: '#343a40', width: "350px", color: 'white', fontSize: "20px", marginLeft: "-0.5em", marginTop: "-0.5em", height: "30px"}}>
            <span style={{padding: "5px"}}><Link href={`/process/${props.id}`}><a style={{color: 'white', textDecoration: 'none'}}>{props.title}</a></Link></span>
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
