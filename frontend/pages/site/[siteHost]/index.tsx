import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';
import { getSiteData, SiteData } from 'lib/api-client';

import { Page } from 'components/Page';
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
        <Page
            title={props.site.name}
        >
            <h1>
                {`Welcome to ${props.site.name}${user.status == UserStatus.LoggedIn ? `, ${user.username}`: ''}!`}
            </h1>
            <p className="text-purple-600">This is a purple text.</p>
            <p className="text-primary text-opacity-50">This is a primary text.</p>
            <p className="text-link text-opacity-50">This is a "link" colored text.</p>

            According to the Page, you are on {props.site.domain}.
        </Page>
    );
}

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages (TechDB entries) to pre-generate at build time.
        // This should be set to a list of popular pages.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",  // https://github.com/vercel/next.js/pull/15672
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

export default HomePage;
