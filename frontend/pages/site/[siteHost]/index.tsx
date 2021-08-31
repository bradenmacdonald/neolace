import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import { ParsedUrlQuery } from 'querystring';

import { Page } from 'components/Page';
import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    siteHost: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const HomePage: NextPage<PageProps> = function(props) {

    
    const user = React.useContext(UserContext);

    return (
        <Page
            title="TechNotes"
        >
            <h1>
                {`Welcome to TechNotes${user.status == UserStatus.LoggedIn ? `, ${user.username}`: ''}!`}
            </h1>
            <p className="text-purple-600">This is a purple text.</p>
            <p className="text-primary text-opacity-50">This is a primary text.</p>
            <p className="text-link text-opacity-50">This is a "link" colored text.</p>

            According to the Page, you are on {props.siteHost}.
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

// deno-lint-ignore require-await
export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    return {
        props: {
            siteHost: context.params.siteHost,
        },
    };
}

export default HomePage;
