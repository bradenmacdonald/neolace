import React from 'react';
import useSWR from 'swr';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { api, client, getSiteData, SiteData } from 'lib/api-client';
import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus } from 'components/user/UserContext';
import { Button } from 'components/widgets/Button';
import { Redirect } from 'components/utils/Redirect';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
import { Spinner } from 'components/widgets/Spinner';

interface PageProps {
    site: SiteData;
    verificationToken: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    verificationToken: string;
}

const LoginPage: NextPage<PageProps> = function(props) {

    const intl = useIntl();
    const user = React.useContext(UserContext);

    // Check if the verification token is valid
    const key = `register-email-validation-token:${props.verificationToken}`;
    const { data, error, mutate } = useSWR(key, async () => {
        const data = await client.checkVerificationToken(props.verificationToken);
        await new Promise(resolve => setTimeout(resolve, 1_000));
        return data;
    }, {
        refreshInterval: 60_000,
    });

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({id: "site.register.confirm", defaultMessage: "Confirm your account"});

    return (
        <SitePage title={title} sitePreloaded={props.site} >
            <h1 className="text-3xl font-semibold">{title}</h1>

            {
                error ?
                    <ErrorMessage>
                        <FormattedMessage id="site.register.error.invalidToken" defaultMessage="The link you clicked has expired or was invalid. Please try creating your account again."/>
                    </ErrorMessage>
                : data ?
                    <>
                        <p>{(data.data as any).fullName}, thank you for verifying your email address ({data.email}). Click the button below to continue, and you will be logged in to your new account.</p>
                        <Button>🚀 Complete account creation.</Button>
                    </>
                :
                    <p>
                        <FormattedMessage id="site.register.checkingToken" defaultMessage="Checking validation token."/>{' '}
                        <Spinner/>
                    </p>
            }

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
            verificationToken: context.params!.verificationToken,
        },
    };
}
