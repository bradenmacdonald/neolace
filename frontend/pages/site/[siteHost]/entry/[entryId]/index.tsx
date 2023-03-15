/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { SDK, client, getSiteData } from "lib/sdk";

import { SiteDataProvider } from "components/SitePage";
import { EntryPage } from "components/EntryPage";

interface PageProps {
    entryKey: SDK.VNID | string;
    publicEntry?: SDK.EntryData;
    sitePreloaded: SDK.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryId: string;
}

const EntryPageWrapper: NextPage<PageProps> = function (props) {
    return (
        <SiteDataProvider sitePreloaded={props.sitePreloaded}>
            {/* Almost all details of the entry page are in the <EntryPage> component; see it for details on why. */}
            <EntryPage entrykey={props.entryKey} publicEntry={props.publicEntry} />
        </SiteDataProvider>
    );
};

export default EntryPageWrapper;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) throw new Error("Internal error - missing URL params."); // Make TypeScript happy

    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };

    // Load whatever data anonymous users can view (whatever data is public).
    // The results of this get cached and served to everyone, so it cannot contain anything that's user specific, nor
    // that requires special permissions. Anything that _does_ require special permissions will be loaded later, in the
    // browser, within the <EntryPage> component using the useEntry() hook.
    let publicEntry: SDK.EntryData | undefined;
    try {
        publicEntry = await client.getEntry(context.params.entryId, {
            siteKey: site.key,
            flags: [
                SDK.GetEntryFlags.IncludePropertiesSummary,
                SDK.GetEntryFlags.IncludeReferenceCache,
                SDK.GetEntryFlags.IncludeFeatures,
            ],
        });
    } catch (err) {
        if (err instanceof SDK.NotFound) {
            return { notFound: true };
        } else if (err instanceof SDK.NotAuthorized || err instanceof SDK.NotAuthenticated) {
            publicEntry = undefined;
        } else {
            throw err;
        }
    }

    if (publicEntry && publicEntry?.key !== context.params.entryId) {
        // If the entry was looked up by an old key or by its VNID, redirect so the [new] key is in the URL:
        return {
            redirect: {
                destination: `/entry/${publicEntry.key}`,
                permanent: true,
            },
            // If it's been more than 5 minutes, check if there's a newer version but still serve from the cache while we do that.
            revalidate: 5 * 60,
        };
    }

    return {
        props: {
            publicEntry,
            entryKey: context.params.entryId,
            sitePreloaded: site,
            // If it's been more than 5 minutes, check if there's a newer version but still serve from the cache while we do that.
            revalidate: 5 * 60,
        },
    };
};
