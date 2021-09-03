import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import { ParsedUrlQuery } from 'querystring';
import Router from 'next/router';
import { FormattedMessage } from 'react-intl';

import { getSiteData, SiteData } from 'lib/api-client';
import { SitePage } from 'components/SitePage';
import { UserContext, UserStatus, requestPasswordlessLogin } from 'components/user/UserContext';

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}

const LoginPage: NextPage<PageProps> = function(props) {

    const user = React.useContext(UserContext);

    // If the user is already logged in, redirect them to the homepage.
    React.useEffect(() => { 
        if (user.status === UserStatus.LoggedIn) {
            Router.push('/');
        }  
    }, [user.status]);

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
        return <>Redirecting you to the home page...</>;
    }

    return (
        <SitePage
            title="Log in to TechNotes"
            site={props.site}
        >
            <h1 className="text-3xl font-semibold">
                <FormattedMessage id="site.login.title" defaultMessage="Log in to {siteName}" values={{siteName: props.site.name}}/>
            </h1>

            <p className="my-4">Account registration is not available yet. If you already have an account though, you can log in here.</p>

            <form>
                <div>
                    <label htmlFor="neo-login-email" className="block">Email address</label>
                    <input value={userEmail} onChange={userEmailChange} type="email" className="rounded p-2 my-2 border border-gray-700 hover:border-blue-300 shadow" id="neo-login-email" aria-describedby="neo-login-email-help"/>
                    <small id="neo-login-email-help" className="block opacity-80">We'll email you a link. Just click it and you'll be logged in!</small>
                </div>
                <button type="submit" className="rounded p-2 my-2 border border-gray-700 hover:bg-blue-300 shadow disabled:text-gray-500 disabled:border-gray-400 disabled:shadow-none" onClick={handleLogin} disabled={userEmail === ""}>Log me in</button>
            </form>
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
    const site = await getSiteData(context.params.siteHost);
    if (site === null) { return {notFound: true}; }

    return {
        props: {
            site,
        },
    };
}
