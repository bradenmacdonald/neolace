import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { ParsedUrlQuery } from 'querystring';

// import { Page } from 'components/Page';
import { UserContext, UserStatus } from 'components/user/UserContext';

interface PageProps {
    siteHost: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const HomePage: NextPage<PageProps> = function(props) {

    
    const user = React.useContext(UserContext);

    return <div>
        <Head>
            <title>Neolace Admin Site</title>
        </Head>
            This is the Neolace admin site.
    </div>;
}

export default HomePage;
