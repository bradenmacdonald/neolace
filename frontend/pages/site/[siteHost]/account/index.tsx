import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { getSiteData, SiteData } from 'lib/api-client';
import { SiteDataProvider, SitePage } from 'components/SitePage';
import { UserStatus, useUser } from "lib/authentication";
import { Redirect } from 'components/utils/Redirect';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const AccountPage: NextPage<PageProps> = function(props) {

    const intl = useIntl();
    const user = useUser();

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }

    const title = intl.formatMessage({id: 'YzZa8+', defaultMessage: "My Profile"}, {siteName: props.site.name});

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage title={title}>
                <h1 className="text-3xl font-semibold">{title}</h1>

                <p>Profile for {user.fullName} ({user.username}). This will have options to change your name, reset password, etc.</p>

            </SitePage>
        </SiteDataProvider>
    );
}

export default AccountPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    }
}

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) { throw new Error("Internal error - missing URL params."); }  // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }

    // Account features are only available on the "home site".
    if (!site.isHomeSite) {
        return {redirect: {destination: `${site.homeSiteUrl}/account/`, permanent: true}};
    }

    return {
        props: {
            site,
        },
    };
}
