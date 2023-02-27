import React from "react";
import { FormattedMessage } from "react-intl";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { SDK, client, getSiteData, RefCacheContext, SiteData } from "lib/sdk";

import { SiteDataProvider, SitePage } from "components/SitePage";
import { MDTContext, RenderMDT } from "components/markdown-mdt/mdt";

interface PageProps {
    site: SiteData;
    /** Markdown content for the homepage */
    homepageContent: string;
    refCache: SDK.ReferenceCacheData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const HomePage: NextPage<PageProps> = function (props) {

    
    const mdtContext = React.useMemo(() => new MDTContext({ entryId: undefined, }), []);

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <RefCacheContext.Provider value={{refCache: props.refCache}}>
                <SitePage title={props.site.name}>
                    {/* Below, 100vh-11.6rem pushes the footer down to the bottom of the screen but prevents scrolling if there's only a single line in the footer */}
                    <div className="max-w-6xl mx-auto neo-typography md:min-h-[calc(100vh-11.6rem)]">
                        {props.homepageContent ?
                            <RenderMDT mdt={props.homepageContent} context={mdtContext} />
                        :
                            <>
                                <h1>
                                    <FormattedMessage id="vfakHv" defaultMessage="Welcome to {siteName}" values={{siteName: props.site.name}}/>
                                </h1>
                                <p>
                                    <FormattedMessage
                                        id="Gb43IT"
                                        defaultMessage="This site is powered by Neolace. If this is your site, you should customize this home page to say what you'd like."
                                        description="A default homepage description, if no home page text has been set."
                                    />
                                </p>
                            </>
                        }
                    </div>
                </SitePage>
            </RefCacheContext.Provider>
        </SiteDataProvider>
    );
}

export default HomePage;

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
    if (site === null) return { notFound: true, revalidate: 60 };

    const homePage = await client.getSiteHomePage({ siteKey: site.key });

    return {
        props: {
            site,
            homepageContent: homePage.homePageContent,
            refCache: homePage.referenceCache,
        },
        revalidate: 60, // Re-create the cached page after 60 seconds, but still show the cached one while doing so.
    };
};
