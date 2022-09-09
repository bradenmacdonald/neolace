import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { api, client, getSiteData } from "lib/api-client";

import { SiteDataProvider } from "components/SitePage";
import { EntryPage } from "components/EntryPage";

interface PageProps {
    entryKey: api.VNID | string;
    publicEntry?: api.EntryData;
    sitePreloaded: api.SiteDetailsData;
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
    let publicEntry: api.EntryData | undefined;
    try {
        publicEntry = await client.getEntry(context.params.entryId, {
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

    if (publicEntry && publicEntry?.friendlyId !== context.params.entryId) {
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
            entryKey: context.params.entryId,
            sitePreloaded: site,
        },
    };
};
