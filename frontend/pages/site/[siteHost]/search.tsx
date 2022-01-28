import React from 'react';
import { GetStaticPaths, GetStaticProps, NextPage} from 'next';
import dynamic from 'next/dynamic';

import { SitePage } from 'components/SitePage';
import { getSiteData, SiteData } from 'lib/api-client';
import { ParsedUrlQuery } from 'querystring';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const PluginTestPage: NextPage<PageProps> = function(props) {

    const pluginName = `search`;

    const PluginComponent = dynamic(
        // Note: it is very important that the pattern below does not match any files in each plugin's node_modules
        // folder, even when the variables like ${pluginName} are substituted with full paths like "..". Otherwise, you
        // will see webpack accounting for many different possible imports that we'll never use, and .next/server/ will
        // be filled with unwanted webpack build files like "plugins_search_node_modules_react_index_js", which slows
        // down the frontend build.
        () =>
            import(`../../../plugins/${pluginName}/plugin-ui/index`),
        {
            loading: () => <p>Loading {pluginName} plugin...</p>,
        }
      );

    return (
        <SitePage
            title={`Search ${props.site.name}`}
            site={props.site}
        >
            <PluginComponent/>
        </SitePage>
    );
}

export default PluginTestPage;

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
    if (site === null) { return {notFound: true}; }

    return {
        props: {
            site,
        },
    };
}
