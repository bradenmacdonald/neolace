import React from 'react';
import { NextPage } from 'next';
import { api, useSiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import FourOhFour from 'pages/404';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
import { Breadcrumb, Breadcrumbs } from 'components/widgets/Breadcrumbs';

const DraftEntryEditPage: NextPage = function(_props) {

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
    } else if (siteError) { return <ErrorMessage>{String(siteError)}</ErrorMessage> }

    return (
        <SitePage
            title={`Edit`}
            sitePreloaded={null}
            leftNavTopSlot={[]}
        >

            <Breadcrumbs>
                <Breadcrumb href={"/"}>New Draft</Breadcrumb>
                <Breadcrumb href={"/"}>Entry</Breadcrumb>
                <Breadcrumb>Edit</Breadcrumb>
            </Breadcrumbs>

            Tabs: Edit | Preview
        </SitePage>
    );
}

export default DraftEntryEditPage;
