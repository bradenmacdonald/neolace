import React from 'react';
import { NextPage } from 'next';
import { api, useSiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePageNew';
import FourOhFour from 'pages/404';

interface PageProps {
}

const DraftEntryEditPage: NextPage<PageProps> = function(props) {

    // Look up the Neolace site by domain:
    const {site, siteError} = useSiteData();
    // if (site === null) { return {notFound: true}; }
    // let entry: api.EntryData;
    // try {
    //     entry = await client.getEntry(context.params!.entryLookup, {siteId: site.shortId, flags: [
    //         api.GetEntryFlags.IncludePropertiesSummary,
    //         api.GetEntryFlags.IncludeReferenceCache,
    //         api.GetEntryFlags.IncludeFeatures,
    //     ]});
    // } catch (err) {
    //     if (err instanceof api.NotFound) {
    //         return {notFound: true};
    //     }
    //     throw err;
    // }

    // if (entry.friendlyId !== context.params!.entryLookup) {
    //     // If the entry was looked up by an old friendlyId or VNID, redirect so the current friendlyId is in the URL:
    //     return {
    //         redirect: {
    //             destination: `/entry/${entry.friendlyId}`,
    //             permanent: true,
    //         },
    //     };
    // }

    if (siteError instanceof api.NotFound) {
        return <FourOhFour/>;
    }

    return (
        <SitePage
            title={`Edit`}
            sitePreloaded={null}
            leftNavTopSlot={[
                {
                    id: "entryName",
                    priority: 10,
                    content: <>
                        <h1 className="font-bold text-base">Entry Name</h1>
                        <span id="entry-type-name" className="font-light">Entry Type Name</span>
                    </>
                },

                {
                    id: "entryFoo",
                    priority: 1,
                    content: <>
                        <h1 className="font-bold text-base">Priority 1</h1>
                        <span id="entry-type-name" className="font-light">Entry Type Name</span>
                    </>
                },
                {
                    id: "entryNames",
                    priority: 10,
                    content: <>
                        <h1 className="font-bold text-base">Last</h1>
                        <span id="entry-type-name" className="font-light">Entry Type Name</span>
                    </>
                },
            ]}
        >

            This is the edit page.
        </SitePage>
    );
}

export default DraftEntryEditPage;
