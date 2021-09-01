import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';
import { getSiteData, SiteData } from 'lib/api-client';

import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const HomePage: NextPage<PageProps> = function(props) {

    
    const user = React.useContext(UserContext);

    return (
        <SitePage
            title={props.site.name}
            site={props.site}
        >
            <h1>
                {`Welcome to ${props.site.name}${user.status == UserStatus.LoggedIn ? `, ${user.username}`: ''}!`}
            </h1>
            <p className="text-purple-600">This is a purple text.</p>
            <p className="text-primary text-opacity-50">This is a primary text.</p>
            <p className="text-link text-opacity-50">This is a "link" colored text.</p>

            <p><Link href="/entry/s-pinus-ponderosa"><a>Go to "Ponderosa Pine"</a></Link></p>
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

    return {
        props: {
            site,
        },
    };
}
