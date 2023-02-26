import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import dynamic from "next/dynamic";
import { ParsedUrlQuery } from "querystring";

import { getSiteData, SiteData } from "lib/api";
import { PluginPageProps } from "components/utils/ui-plugins";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";

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
const PluginPage: NextPage<PageProps> = function ({ pluginId, pluginPage, ...props }) {
    // If we get here, then a plugin is being used:

    const PluginComponent = React.useMemo(() => dynamic<PluginPageProps>(
        // Note: it is very important that the pattern below does not match any files in each plugin's node_modules
        // folder, even when the variables like ${pluginId} are substituted with full paths like "..". Otherwise, you
        // will see webpack accounting for many different possible imports that we'll never use, and .next/server/ will
        // be filled with unwanted webpack build files like "plugins_search_node_modules_react_index_js", which slows
        // down the frontend build.
        () => import(`../../../plugins/${pluginId}/plugin-pages/${pluginPage}`),
        {
            loading: () => (
                <SitePage title={"Loading..."}>
                    <Spinner />
                </SitePage>
            ),
        },
    ), [pluginId, pluginPage]);

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <PluginComponent path={props.path} />
        </SiteDataProvider>
    );
};

export default PluginPage;

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
    if (site === null) {
        return { notFound: true };
    }

    // Check if any redirect is configured for this particular URL:
    const origPath = "/" + (context.params.otherPath as string);
    const newPath = site.frontendConfig.redirects?.[origPath];
    if (newPath) {
        return {
            redirect: {
                destination: newPath,
                permanent: true,
            },
        };
    }

    // Check if this page is served by a plugin:
    const allPlugins = await import("components/utils/ui-plugins-loader").then((mod) => mod.allPlugins);
    const enabledPluginIds = Object.keys(site.frontendConfig.plugins ?? {});
    for (const plugin of allPlugins) {
        if (enabledPluginIds.includes(plugin.id)) {
            const pageName = plugin.getPageForPath?.(site, origPath);
            if (pageName) {
                return { props: { site, path: origPath, pluginId: plugin.id, pluginPage: pageName } };
            }
        }
    }

    return { notFound: true };
};
