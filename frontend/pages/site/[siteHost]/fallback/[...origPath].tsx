import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import dynamic from "next/dynamic";
import { ParsedUrlQuery } from "querystring";

import { getSiteData, SiteData } from "lib/api-client";
import { PluginPageProps } from "components/utils/ui-plugins";
import { SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";
import { SiteDataProvider } from "components/utils/SiteDataProvider";

interface PageProps {
    site: SiteData;
    path: string;
    pluginId: string;
    pluginPage: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

/**
 * This page/route is used to implement site-specific redirects. If a given URL is not matched, this page is loaded as a
 * fallback. It checks if the URL is configured as a site-specific redirect; if so, the user is redirected. If not, we
 * check if a plugin wants to serve this page; if so, we use the plugin. Otherwise we throw a 404.
 */
const FallbackPage: NextPage<PageProps> = function ({pluginId, pluginPage, ...props}) {

    // If we get here, then a plugin is being used:

    const PluginComponent = dynamic<PluginPageProps>(
        // Note: it is very important that the pattern below does not match any files in each plugin's node_modules
        // folder, even when the variables like ${pluginId} are substituted with full paths like "..". Otherwise, you
        // will see webpack accounting for many different possible imports that we'll never use, and .next/server/ will
        // be filled with unwanted webpack build files like "plugins_search_node_modules_react_index_js", which slows
        // down the frontend build.
        () => import(`../../../../plugins/${pluginId}/plugin-pages/${pluginPage}`),
        {
            loading: () => <SiteDataProvider sitePreloaded={props.site}><SitePage title={"Loading..."}><Spinner/></SitePage></SiteDataProvider>,
        },
    );

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <PluginComponent path={props.path} />
        </SiteDataProvider>
    );
};

export default FallbackPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) { throw new Error("Internal error - missing URL params."); }  // Make TypeScript happy

    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) {
        return { notFound: true };
    }

    const origPath = "/" + (context.params.origPath as string[]).slice(2).join("/");
    const newPath = site.frontendConfig.redirects?.[origPath];
    if (newPath) {
        return {
            redirect: {
                destination: newPath,
                permanent: true,
            },
        };
    }

    const allPlugins = await import("components/utils/ui-plugins-loader").then((mod) => mod.allPlugins);
    const enabledPluginIds = Object.keys(site.frontendConfig.plugins ?? {});
    for (const plugin of allPlugins) {
        if (enabledPluginIds.includes(plugin.id)) {
            const pageName = plugin.getPageForPath?.(site, origPath);
            if (pageName) {
                return {props: {site, path: origPath, pluginId: plugin.id, pluginPage: pageName}};
            }
        }
    }
    
    return {notFound: true};
};
