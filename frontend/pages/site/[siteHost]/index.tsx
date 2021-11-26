import React from 'react';
import { FormattedMessage } from 'react-intl';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';
import { getSiteData, SiteData, api, client } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus } from 'components/user/UserContext';
import { MDTContext, RenderMDT } from 'components/markdown-mdt/mdt';

interface PageProps {
    site: SiteData;
    /** Markdown content for the homepage */
    homepageMD: string;
    refCache: api.ReferenceCacheData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const HomePage: NextPage<PageProps> = function(props) {

    
    const mdtContext = React.useMemo(() => new MDTContext({
        refCache: props.refCache,
    }), [props.site.shortId]);
    const user = React.useContext(UserContext);

    return (
        <SitePage
            title={props.site.name}
            site={props.site}
        >
            {/* Below, 100vh-11.6rem pushes the footer down to the bottom of the screen but prevents scrolling if there's only a single line in the footer */}
            <div className="max-w-6xl mx-auto neo-typography md:min-h-[calc(100vh-11.6rem)]">
                {props.homepageMD ?
                    <RenderMDT mdt={props.homepageMD} context={mdtContext} />
                :
                    <>
                        <h1>
                            <FormattedMessage id="site.home.defaultTitle" defaultMessage="Welcome to {siteName}" values={{siteName: props.site.name}}/>
                        </h1>
                        <p>
                            <FormattedMessage
                                id="site.home"
                                defaultMessage="This site is powered by Neolace. If this is your site, you should customize this home page to say what you'd like."
                                description="A default homepage description, if no home page text has been set."
                            />
                        </p>
                    </>
                }
            </div>
        </SitePage>
    );
}

export default HomePage;

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
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }

    const homePage = await client.getSiteHomePage({siteId: site.shortId});

    return {
        props: {
            site,
            homepageMD: homePage.homePageMD,
            refCache: homePage.referenceCache,
        },
    };
}
