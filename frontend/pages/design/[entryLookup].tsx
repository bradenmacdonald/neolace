import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths, } from 'next'
import Link from 'next/link';
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring';

import { Page } from 'components/Page';
import { MetadataTable, MetadataEntry } from 'components/techdb/MetadataTable';
import { client } from 'lib/api-client';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import { DesignData, TechDbEntryFlags } from 'neolace-api';
import { urlForShortId } from 'components/utils/urls';

interface PageProps {
    pageData: DesignData|null;
}
interface PageUrlQuery extends ParsedUrlQuery {
    entryLookup: string;
}

const TypesSection = "tps";

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
    // For http://www.technotes.org/tech/t-pv-cell-c-si it would be 't-pv-cell-c-si'.
    // It should always be in lower case.
    let key = context.params?.entryLookup || "";
    let pageData: DesignData|null;

    try {
        const result = await client.getDesign({key, flags: [TechDbEntryFlags.numRelatedImages]});
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
            pageData,
        },
    }
}  

const ContentPage: NextPage<PageProps> = function({pageData, ...props}) {
    const mdtContext = React.useMemo(() => new MDTContext(), [pageData?.uuid]);

    if (pageData === null) {
        return <p>Data missing.</p>;
    }

    return <Page title={pageData.name}>

        {/* Hero image */}
        <div className="row mt-n2 mt-md-n3 mb-2 mb-md-3">
            <div className="col col-12">
                <div className="tn-full-width-hero">
                    <img src={pageData.heroImage?.imageUrl ?? "/solar-geo-from-nasa-yZygONrUBe8-unsplash.jpg"} alt="" />
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
            {pageData.isA.length > 0 &&
                <MetadataEntry label="Type of">
                    <ul>
                        {pageData.isA.map(parent =>
                            <li key={parent.shortId}><Link href={urlForShortId(parent.shortId)}><a>{parent.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.variants.length > 0 &&
                <MetadataEntry label="Variants">
                    <ul>
                        {pageData.variants.map(child =>
                            <li key={child.shortId}><Link href={urlForShortId(child.shortId)}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.versions.length > 0 &&
                <MetadataEntry label="Versions">
                    <ul>
                        {pageData.versions.map(child =>
                            <li key={child.shortId}><Link href={urlForShortId(child.shortId)}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.usedIn.length > 0 &&
                <MetadataEntry label="Used in">
                    <ul>
                        {pageData.usedIn.map(child =>
                            <li key={child.shortId}><Link href={urlForShortId(child.shortId)}><a>{child.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.antecedents.length > 0 &&
                <MetadataEntry label="Atecedents">
                    <ul>
                        {pageData.antecedents.map(entry =>
                            <li key={entry.shortId}><Link href={urlForShortId(entry.shortId)}><a>{entry.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.derivedDesigns.length > 0 &&
                <MetadataEntry label="Derived Designs">
                    <ul>
                        {pageData.derivedDesigns.map(entry =>
                            <li key={entry.shortId}><Link href={urlForShortId(entry.shortId)}><a>{entry.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            {pageData.hasParts.length > 0 &&
                <MetadataEntry label="Components">
                    <ul>
                        {pageData.hasParts.map(entry =>
                            <li key={entry.shortId}><Link href={urlForShortId(entry.shortId)}><a>{entry.name}</a></Link></li>
                        )}
                    </ul>
                </MetadataEntry>
            }
            <MetadataEntry label="Library Resources">
                {
                    (pageData.numRelatedImages || 0) > 0 ?
                        <Link href={`/library/images/related/${pageData.shortId}`}><a>{pageData.numRelatedImages} images</a></Link>
                    :
                        "No related images"
                }
            </MetadataEntry>
        </MetadataTable>

        {
            pageData.articleSections.map(section =>
                section.content ?
                    <div className="row" key={section.code}>
                        <div className="col col-12">
                            <h2 id={section.code}>{section.title}</h2>
                            <RenderMDT mdt={section.content} context={mdtContext} />
                        </div>
                    </div>
                : null
            )
        }
    </Page>;
}

export default ContentPage;
