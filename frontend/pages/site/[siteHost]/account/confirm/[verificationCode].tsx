import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { client, getSiteData, SiteData } from 'lib/api-client';
import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus } from 'components/user/UserContext';
import { Button } from 'components/widgets/Button';
import { Redirect } from 'components/utils/Redirect';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const LoginPage: NextPage<PageProps> = function(props) {

    const intl = useIntl();
    const user = React.useContext(UserContext);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({id: "site.register.confirm", defaultMessage: "Confirm your account"});

    return (
        <SitePage title={title} sitePreloaded={props.site} >
            <h1 className="text-3xl font-semibold">{title}</h1>

            <Button>Complete account creation.</Button>

        </SitePage>
    );
}

export default LoginPage;

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
