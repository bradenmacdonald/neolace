import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths, } from 'next'
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring';

import { Page } from 'components/Page';
import { client } from 'lib/api-client';
import { InlineMDT, MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';
import { TechDbEntryData, TechDbEntryFlags } from 'technotes-api';
import { urlForShortId } from 'components/utils/urls';

interface PageProps {
    entry: TechDbEntryData|null;
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
      fallback: "blocking",
    }
  }

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    // entryLookup: the part of the URL used to identify this page.
    // For http://www.technotes.org/tech/t-pv-cell-c-si it would be 't-pv-cell-c-si'.
    // It should always be in lower case.
    let key = context.params?.entryLookup ?? "";
    let entry: TechDbEntryData|null;

    try {
        entry = await client.getTechDbEntry({key, flags: [TechDbEntryFlags.relatedImages, TechDbEntryFlags.numRelatedImages]});
    } catch (e) {
        // TODO: only redirect if this was a 404, not 500 etc.
        console.error(e);
        //redirectTo = `/db/quick-search/${key}`;
        entry = null;
    }

    return {
      props: {
          entry,
      },
    }
}  

const ContentPage: NextPage<PageProps> = function({entry, ...props}) {
    const mdtContext = React.useMemo(() => new MDTContext(), [entry?.uuid]);
    const router = useRouter();

    if (entry === null) {
        return <p>Failed to load that TechDB entry.</p>
    }

    return <Page title={`Images related to ${entry.name}`}>

        <div className="row">
            <div className="col col-12">

                <h1>{entry.name} - related images</h1>

                <p>
                    <InlineMDT mdt={entry.description} context={mdtContext} />{" "}
                    <Link href={urlForShortId(entry.shortId)}><a>See TechDB entry for details.</a></Link>
                </p>

                <p>TechNotes has {entry.numRelatedImages} related images:</p>
            </div>
        </div>


        <div className="row">
            {(entry.relatedImages ?? []).map(img =>
                <div className="col col-12 col-md-4 col-lg-3 mb-4 text-break" key={img.uuid}>
                    <a href={img.imageUrl} className="d-block position-relative" style={{height: "200px"}}>
                        <Image src={img.imageUrl} alt={img.name} layout="fill" objectFit="contain" sizes={process.env.imageSizesAttr} />
                    </a>
                    <strong>{img.name}</strong><br/>
                    <p>
                        <small><InlineMDT mdt={img.description} context={mdtContext} /></small>
                    </p>
                </div>
            )}
        </div>
    </Page>;
}

export default ContentPage;
