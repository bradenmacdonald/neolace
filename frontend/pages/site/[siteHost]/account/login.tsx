import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { FormattedMessage, useIntl } from "react-intl";

import { client, getSiteData, SiteData, UserStatus, useUser } from "lib/api";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { Control, Form } from "components/form-input/Form";
import { Button } from "components/widgets/Button";
import { Redirect } from "components/utils/Redirect";
import { defineMessage } from "components/utils/i18n";
import { ActionStatus, ActionStatusDisplay, useActionStatus } from "components/widgets/ActionStatusDisplay";
import { SuccessMessage } from "components/widgets/SuccessMessage";
import { TextInput } from "components/form-input/TextInput";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const LoginPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = useUser();

    const [userEmail, setUserEmail] = React.useState("");
    const userEmailChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setUserEmail(event.target.value);
    }, []);

    const [loginStatus, wrapLogin, setLoginStatus] = useActionStatus();

    // Handler for when user enters their email and clicks "log in"
    const handleLogin = React.useCallback(async (event: React.MouseEvent) => {
        event.preventDefault();
        const result = await wrapLogin(client.requestPasswordlessLogin({ email: userEmail }));
        if (result.requested) {
            setLoginStatus(ActionStatus.Success);
        } else {
            setLoginStatus(ActionStatus.Error, new Error("You don't have an account. Please register first."));
        }
    }, [userEmail, wrapLogin, setLoginStatus]);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({ id: "Ap3TN6", defaultMessage: "Log in to {siteName}" }, {
        siteName: props.site.name,
    });

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage title={title}>
                <h1 className="text-3xl font-semibold">{title}</h1>

                <p>
                    Account registration is not yet available. However, if you already have an account, you can log in
                    here:
                </p>

                <Form>
                    <Control
                        id="login-email"
                        label={defineMessage({ id: "xxQxLE", defaultMessage: "Email Address" })}
                        hint={defineMessage({
                            defaultMessage: "We'll email you a link. Just click it and you'll be logged in.",
                            id: "E5pRaZ",
                        })}
                    >
                        <TextInput value={userEmail} onChange={userEmailChange} />
                    </Control>
                    <Button
                        onClick={handleLogin}
                        disabled={userEmail === "" || loginStatus.status === ActionStatus.InProgress ||
                            loginStatus.status === ActionStatus.Success}
                        className="font-bold"
                    >
                        <FormattedMessage id="odXlk8" defaultMessage="Log in" />
                    </Button>
                    <ActionStatusDisplay
                        state={loginStatus}
                        className="my-3"
                        success={
                            <SuccessMessage>
                                <FormattedMessage
                                    defaultMessage="We have emailed you a link. Click it to log in."
                                    id="bnOkqc"
                                />
                            </SuccessMessage>
                        }
                    />
                </Form>

                {
                    /*}
            <p className="!mt-[100px]">
                <FormattedMessage
                    id="site.login.howToCreateAccount"
                    defaultMessage="Don't have an account? <link>Create an account.</link>"
                    values={{
                        link: (str: string) => <Link href="/account/create"><a>{str}</a></Link>,
                    }}
                />
            </p>*/
                }
            </SitePage>
        </SiteDataProvider>
    );
};

export default LoginPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) throw new Error("Internal error - missing URL params."); // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };

    // Users are only able to log in via the "home site".
    if (!site.isHomeSite) {
        return { redirect: { destination: `${site.homeSiteUrl}/account/login`, permanent: true } };
    }

    return {
        props: {
            site,
        },
    };
};
