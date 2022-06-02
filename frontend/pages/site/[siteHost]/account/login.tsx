import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { getSiteData, SiteData } from 'lib/api-client';
import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus, requestPasswordlessLogin } from 'components/user/UserContext';
import { Control, Form } from 'components/widgets/Form';
import { TextInput } from 'components/widgets/TextInput';
import { Button } from 'components/widgets/Button';
import { Redirect } from 'components/utils/Redirect';
import Link from 'next/link';
import { defineMessage } from 'components/utils/i18n';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const LoginPage: NextPage<PageProps> = function(props) {

    const intl = useIntl();
    const user = React.useContext(UserContext);

    const [userEmail, setUserEmail] = React.useState("");
    const userEmailChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUserEmail(event.target.value);
    }, []);

    // Handler for when user enters their email and clicks "log in"
    const handleLogin = React.useCallback(async (event: React.MouseEvent) => {
        event.preventDefault();
        if (await requestPasswordlessLogin(userEmail)) {
            alert("A link was emailed to you; just click it an you'll be logged in.");
        } else {
            alert("You don't have an account. Please register first.");
        }
    }, [userEmail]);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({id: 'Ap3TN6', defaultMessage: "Log in to {siteName}"}, {siteName: props.site.name});

    return (
        <SitePage title={title} sitePreloaded={props.site} >
            <h1 className="text-3xl font-semibold">{title}</h1>

            <p>Account registration is not yet available. However, if you already have an account, you can log in here:</p>

            <Form>
                <Control
                    id="login-email"
                    label={defineMessage({id: 'xxQxLE', defaultMessage: "Email Address"})}
                    hint={defineMessage({
                        defaultMessage: "We'll email you a link. Just click it and you'll be logged in.",
                        id: 'E5pRaZ',
                    })}
                >
                    <TextInput value={userEmail} onChange={userEmailChange} />
                </Control>
                <Button onClick={handleLogin} disabled={userEmail === ""} className="font-bold">
                    <FormattedMessage id="odXlk8" defaultMessage="Log in" />
                </Button>
            </Form>

            {/*}
            <p className="!mt-[100px]">
                <FormattedMessage
                    id="site.login.howToCreateAccount"
                    defaultMessage="Don't have an account? <link>Create an account.</link>"
                    values={{
                        link: (str: string) => <Link href="/account/create"><a>{str}</a></Link>,
                    }}
                />
            </p>*/}

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
    if (!context.params) { throw new Error("Internal error - missing URL params."); }  // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }

    // Users are only able to log in via the "home site".
    if (!site.isHomeSite) {
        return {redirect: {destination: `${site.homeSiteUrl}/account/login`, permanent: true}};
    }

    return {
        props: {
            site,
        },
    };
}
