import React from "react";
import useSWR from "swr";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { FormattedMessage, useIntl } from "react-intl";
import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";

import { client, getSiteData, SiteData } from "lib/api-client";
import { SitePage } from "components/SitePage";
import { UserContext, UserStatus } from "components/user/UserContext";
import { Button } from "components/widgets/Button";
import { Redirect } from "components/utils/Redirect";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { SuccessMessage } from "components/widgets/SuccessMessage";

interface PageProps {
    site: SiteData;
    verificationToken: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
    verificationToken: string;
}

const LoginPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = React.useContext(UserContext);

    // Check if the verification token is valid
    const key = `register-email-validation-token:${props.verificationToken}`;
    const { data, error, mutate } = useSWR(key, async () => {
        const data = await client.checkVerificationToken(props.verificationToken);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        return data;
    }, {
        refreshInterval: 60_000,
    });

    // Has the user actually clicked the "Create Account" button?
    const [isCreatingAccount, setIsCreatingAccount] = React.useState(false);
    const [finalizeAccount, setFinalizeAccount] = React.useState<{ tempCredentials: [username: string, password: string] } | undefined>();

    /** When they click the button, actually create their account and log them in: */
    const doCreateAccount = React.useCallback(async () => {
        if (!data) return;
        setIsCreatingAccount(true);
        const regData = await client.registerHumanUser({
            emailToken: props.verificationToken,
            fullName: data.data.fullName,
        });
        // Log in as the user
        try {
            await KeratinAuthN.login({
                username: regData.temporaryCredentials.username,
                password: regData.temporaryCredentials.password,
            });
        } catch (err) {
            alert("Your account was created but you couldn't be logged in. Try logging in yourself.");
            return;
        }
        setFinalizeAccount({
            tempCredentials: [
                regData.temporaryCredentials.username,
                regData.temporaryCredentials.password,
            ],
        });
    }, [data, props.verificationToken]);

    if (finalizeAccount) {
        const title = intl.formatMessage({ id: '/B3THW', defaultMessage: "Finalize your account" });
        return (
            <SitePage title={title} sitePreloaded={props.site}>
                <h1 className="text-3xl font-semibold">{title}</h1>

                <SuccessMessage>
                    <FormattedMessage
                        id="ksbTy8"
                        defaultMessage="Your account has been created, and you are now logged in."
                    />
                </SuccessMessage>
            </SitePage>
        );
    } else if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({ id: 'wG7BjX', defaultMessage: "Confirm your account" });

    return (
        <SitePage title={title} sitePreloaded={props.site}>
            <h1 className="text-3xl font-semibold">{title}</h1>

            {error
                ? (
                    <ErrorMessage>
                        <FormattedMessage
                            id="ZrwLkD"
                            defaultMessage="The link you clicked has expired or was invalid. Please try creating your account again."
                        />
                    </ErrorMessage>
                )
                : data
                ? (
                    <>
                        <p>
                            {data.data.fullName}, thank you for verifying your email address ({data.email}). Click the
                            button below to continue, and you will be logged in to your new account.
                        </p>
                        {isCreatingAccount
                            ? <Spinner />
                            : <Button onClick={doCreateAccount}>🚀 Complete account creation.</Button>}
                    </>
                )
                : (
                    <p>
                        <FormattedMessage
                            id="qNBuoM"
                            defaultMessage="Checking validation token."
                        />{" "}
                        <Spinner />
                    </p>
                )}
        </SitePage>
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
    if (!context.params) { throw new Error("Internal error - missing URL params."); }  // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };

    return {
        props: {
            site,
            verificationToken: context.params.verificationToken,
        },
    };
};
