import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { api, client, getSiteData } from "lib/api-client";

import { SiteDataProvider } from "components/SitePage";
import { EntryPage } from "components/EntryPage";
//import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    entryKey: api.VNID | string;
    publicEntry?: api.EntryData;
    sitePreloaded: api.SiteDetailsData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    entryLookup: string;
}

const EntryPageWrapper: NextPage<PageProps> = function (props) {
    return (
        <SiteDataProvider sitePreloaded={props.sitePreloaded}>
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
    let publicEntry: api.EntryData | undefined;
    try {
        publicEntry = await client.getEntry(context.params.entryLookup, {
            siteId: site.shortId,
            flags: [
                api.GetEntryFlags.IncludePropertiesSummary,
                api.GetEntryFlags.IncludeReferenceCache,
                api.GetEntryFlags.IncludeFeatures,
            ],
        });
    } catch (err) {
        if (err instanceof api.NotFound) {
            return { notFound: true };
        } else if (err instanceof api.NotAuthorized || err instanceof api.NotAuthenticated) {
            publicEntry = undefined;
        } else {
            throw err;
        }
    }

    if (publicEntry && publicEntry?.friendlyId !== context.params.entryLookup) {
        // If the entry was looked up by an old friendlyId or VNID, redirect so the current friendlyId is in the URL:
        return {
            redirect: {
                destination: `/entry/${publicEntry.friendlyId}`,
                permanent: true,
            },
        };
    }

    return {
        props: {
            publicEntry,
            entryKey: context.params.entryLookup,
            sitePreloaded: site,
        },
    };
};
