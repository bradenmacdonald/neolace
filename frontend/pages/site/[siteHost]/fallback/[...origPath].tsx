import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';


import { getSiteData, SiteData } from 'lib/api-client';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const FallbackPage: NextPage<PageProps> = function(props) {

    return <p>This page is never seen directly. It either redirects or throws a 404.</p>;
}

export default FallbackPage;

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
    const site = await getSiteData(context.params!.siteHost);
    if (site === null) {
        return {notFound: true};
    }

    const origPath = '/' + (context.params!.origPath as string[]).slice(2).join("/");
    const newPath = site.frontendConfig.redirects?.[origPath];
    if (newPath) {
        return {redirect: {
            destination: newPath,
            permanent: true,
        }};
    } else {
        return {notFound: true};
    }
}
