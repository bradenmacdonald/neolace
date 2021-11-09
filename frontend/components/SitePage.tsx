import React from 'react';
import Head from 'next/head'
import Link from 'next/link';

import { UserContext, UserStatus } from 'components/user/UserContext';
import { SiteData } from 'lib/api-client';

interface Props {
    title: string;
    site: SiteData;
}

/**
 * Template for a "regular" Neolace page, for a specific site (e.g. foo.neolace.com), as opposed to the Neolace Admin UI
 */
export const SitePage: React.FunctionComponent<Props> = (props) => {
    const user = React.useContext(UserContext);

    // props.site has the site data, but it can also be retrieved like this:
    // import { useRouter } from 'next/router';
    // const router = useRouter();
    // router.query.siteHost gives the site's domain

    return <div>
        <Head>
            <title>{props.title}</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
            <link rel="icon" type="image/vnd.microsoft.icon" href="/favicon.ico"/>
            {/* Load "Inter Var" from rsms.me, which is served by CloudFlare CDN */}
            <link href="https://rsms.me/inter/inter.css" rel="stylesheet"/>
            {/* Load "Roboto Mono" as a variable font (:wght@100..700) from Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@100..700&amp;display=swap" rel="stylesheet"/>
            <style>{`
                :root {
                    --site-primary-color: 0, 255, 0;
                    --site-link-color: 0, 0, 255;
                }
            `}</style>
        </Head>

        {/* Main header: */}
        <header id="neo-main-header" className="bg-header-color w-screen h-8 md:h-24 grid grid-cols-12">
            {/* Site name/logo */}
            <div className="col-span-6 md:col-span-5 max-h-8 md:max-h-24 p-1 md:p-3">
                <Link href="/">
                    {/* a: block w-full h-full fix the image sizing on safari */}
                    <a className="block w-full h-full"><img alt={props.site.name} src={`/${props.site.shortId}.svg`} id="neo-site-logo" className="max-w-full max-h-full" /></a>
                </Link>
            </div>
            {/* Search (TODO) */}
            <div className="col-span-4 md:col-span-6">
            </div>
            <div className="col-span-2 md:col-span-1 flex justify-end items-center p-1 md:p-3 text-header-color-light">
                {/*
                    // Show the user's avatar if they're logged in, otherwise a placeholder link to the login page.
                    user.status === UserStatus.LoggedIn ? (
                        <img className="rounded max-h-100" alt="User Avatar" src="/avatar-unsplash-theyshane.jpg" />
                    ): user.status === UserStatus.Anonymous ? (
                        <Link href="/login"><a className="inline-block w-auto h-full">
                            <svg className="rounded h-full" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                                {/ * Thanks https://icons.getbootstrap.com/icons/person-fill/ (MIT) * /}
                            </svg>
                        </a></Link>
                    ): / * default case, user status is unknown: * / (
                        <svg className="rounded h-full" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" /></svg>
                    )
                */}
            </div>
        </header>

        <main role="main" className="absolute top-8 md:top-24 p-2 w-full bottom-0 overflow-y-auto">
            {props.children}
        </main>
  </div>
};
