import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { FormattedMessage, useIntl } from 'react-intl';

import { api, client, getSiteData, SiteData } from 'lib/api-client';
import { SiteDataProvider, SitePage } from 'components/SitePage';
import { UserContext, UserStatus } from 'components/user/UserContext';
import { Control, Form } from 'components/widgets/Form';
import { TextInput } from 'components/widgets/TextInput';
import { Button } from 'components/widgets/Button';
import { Redirect } from 'components/utils/Redirect';
import { Spinner } from 'components/widgets/Spinner';
import { SuccessMessage } from 'components/widgets/SuccessMessage';
import { ErrorMessage } from 'components/widgets/ErrorMessage';
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
    const [isSubmittedSuccessfully, setSubmittedSuccessfully] = React.useState(false);
    const [submissionError, setSubmissionError] = React.useState<string|undefined>(undefined);
    const handleRegister = React.useCallback(async (event: React.MouseEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        setSubmissionError(undefined);
        try {
            await client.requestEmailVerification({
                email: userEmail,
                data: { fullName: userFullName },
                siteId: props.site.shortId,
                returnUrl: new URL("/account/confirm", location.href).toString() + "/{token}/",
            });
            setSubmittedSuccessfully(true);
        } catch (err) {
            if (err instanceof api.ApiError) {
                setSubmissionError(err.message);
            } else {
                throw err;
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [userFullName, userEmail]);

    if (user.status === UserStatus.LoggedIn) {
        return <Redirect to="/" />;
    }

    const title = intl.formatMessage({id: '0vL5u1', defaultMessage: "Create an account"});

    return (<SiteDataProvider sitePreloaded={props.site}>
        <SitePage title={title}>
            <h1 className="text-3xl font-semibold">{title}</h1>

            <p>
                <FormattedMessage id="Kh6Wbq" defaultMessage="We just need a few things to create your account:" />
            </p>

            <Form>
                <Control
                    id="register-fullname"
                    label={defineMessage({id: 'vlKhIl', defaultMessage: "Your name"})}
                    hint={defineMessage({id: 'iBUQ6O', defaultMessage: "Please enter your full, real name as you want it displayed. For example: \"Braden MacDonald\" or \"J. R. R. Tolkien\". This name will be displayed on your profile and whenever you make any contributions or comments on the site."})}
                >
                    <TextInput value={userFullName} onChange={userFullNameChange} />
                </Control>

                <Control
                    id="register-email"
                    label={defineMessage({id: 'xxQxLE', defaultMessage: "Email Address"})}
                    hint={defineMessage({id: 'rgD0qZ', defaultMessage: "We'll email you a link to activate your new account. You'll need to enter this same email whenever you log in."})}
                >
                    <TextInput type="email" value={userEmail} onChange={userEmailChange} />
                </Control>

                <Button
                    onClick={handleRegister}
                    disabled={userFullName === "" || userEmail === "" || isSubmitting || isSubmittedSuccessfully}
                >
                    🚀 <FormattedMessage id="gvYd3d" defaultMessage="Create my account" />
                </Button>

                <br/>
                <br/>

                {isSubmitting && <Spinner/>}
                {isSubmittedSuccessfully &&
                    <SuccessMessage>
                        <FormattedMessage id="fKfR1D" defaultMessage="Please check your email and click the link we sent you to activate your account." />
                    </SuccessMessage>
                }
                {submissionError &&
                    <ErrorMessage>
                        {submissionError}
                    </ErrorMessage>
                }
            </Form>

        </SitePage>
    </SiteDataProvider>);
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
