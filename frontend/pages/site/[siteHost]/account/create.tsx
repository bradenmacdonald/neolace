import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { client, getSiteData, SiteData } from 'lib/api-client';
import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus, requestPasswordlessLogin } from 'components/user/UserContext';
import { Control, Form } from 'components/widgets/Form';
import { TextInput } from 'components/widgets/TextInput';
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

    const [userFullName, setUserFullName] = React.useState("");
    const userFullNameChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUserFullName(event.target.value);
    }, []);

    const [userEmail, setUserEmail] = React.useState("");
    const userEmailChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUserEmail(event.target.value);
    }, []);

    // Handler for when user enters their email and clicks "Create Account"
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const handleRegister = React.useCallback(async (event: React.MouseEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        await client.requestEmailVerification({
            email: userEmail,
            data: { fullName: userFullName },
            siteId: props.site.shortId,
            returnUrl: new URL("/account/confirm", location.href).toString() + "/{token}/",
        }),
        setIsSubmitting(false);
    }, [userFullName, userEmail]);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({id: "site.login.title", defaultMessage: "Create an account"});

    return (
        <SitePage title={title} sitePreloaded={props.site} >
            <h1 className="text-3xl font-semibold">{title}</h1>

            <p>
                <FormattedMessage id="site.register.instructions" defaultMessage="We just need a few things to create your account:" />
            </p>

            <Form>
                <Control
                    id="register-fullname"
                    label={{id: "site.register.name", defaultMessage: "Your name"}}
                    hint={intl.formatMessage({id: "site.register.name.hint", defaultMessage: "Please enter your full, real name as you want it displayed. For example: \"Braden MacDonald\" or \"J. R. R. Tolkien\". This name will be displayed on your profile and whenever you make any contributions or comments on the site."})}
                >
                    <TextInput value={userFullName} onChange={userFullNameChange} />
                </Control>

                <Control
                    id="register-email"
                    label={{id: "site.register.email", defaultMessage: "Email Address"}}
                    hint={intl.formatMessage({id: "site.register.email.hint", defaultMessage: "We'll email you a link to activate your new account. You'll need to enter this same email whenever you log in."})}
                >
                    <TextInput type="email" value={userEmail} onChange={userEmailChange} />
                </Control>

                <Button
                    onClick={handleRegister}
                    disabled={userFullName === "" || userEmail === ""}
                >
                    🚀 <FormattedMessage id="site.register.submit" defaultMessage="Create my account" />
                </Button>
            </Form>

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
