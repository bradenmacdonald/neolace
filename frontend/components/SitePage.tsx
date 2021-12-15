import React from 'react';
import Head from 'next/head'
import Link from 'next/link';

import { UserContext, UserStatus } from 'components/user/UserContext';
import { SiteData } from 'lib/api-client';
import { SiteFooter } from './SiteFooter';

interface Props {
    title: string;
    site: SiteData;
    hideFooter?: boolean;
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

    const siteLinks = [
        {text: "Home", href: "/"},
        {text: "About", href: "/entry/about"},
        {text: "Team", href: "/entry/team"},
        {text: "TesteroniA", href: "/entry/teamX"},
        {text: "TesteroniB", href: "/entry/teamX"},
        {text: "TesteroniC", href: "/entry/teamX"},
        {text: "TesteroniD", href: "/entry/teamX"},
        {text: "TesteroniE", href: "/entry/teamX"},
        {text: "TesteroniF", href: "/entry/teamX"},
        {text: "TesteroniG", href: "/entry/teamX"},
        {text: "TesteroniH", href: "/entry/teamX"},
        {text: "TesteroniI", href: "/entry/teamX"},
    ];

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
        <header id="neo-main-header" className="bg-header-color w-screen h-8 md:h-24 flex flex-row flex-nowrap">
            {/* Site name/logo */}
            <div className="flex-none max-h-8 md:max-h-24 p-1 md:p-3">
                <Link href="/">
                    {/* a: block w-full h-full fix the image sizing on safari */}
                    <a className="block w-full h-full"><img alt={props.site.name} src={`/${props.site.shortId}.svg`} id="neo-site-logo" className="max-w-full max-h-full" /></a>
                </Link>
            </div>
            <div className="flex-auto min-w-0 items-center p-1 md:p-3 text-header-color-light self-center text-center text-sm md:text-lg"> {/* min-w-0 is required here per https://stackoverflow.com/a/66689926 */}
                {/* Site-Specific Nav Links */}
                <nav>
                    <ul className="flex">
                        {
                            siteLinks.map((link, idx) => 
                                <li key={idx} className={`inline-block mr-4 hover:text-gray-300 whitespace-nowrap ${idx >= 2 ? "overflow-hidden overflow-ellipsis" : ""}`}><Link href={link.href}><a>{link.text}</a></Link></li>
                            )
                        }
                    </ul>
                </nav>
                {/* Search */}
                {/* TODO - search box */}
            </div>
            <div className="flex-none flex justify-center p-1 md:p-3 text-header-color-light">
                {
                    // Show the user's avatar if they're logged in, otherwise a placeholder link to the login page.
                    user.status === UserStatus.LoggedIn ? (
                        <img className="rounded max-h-100" alt="User Avatar" src="/avatar-unsplash-theyshane.jpg" />
                    ): user.status === UserStatus.Anonymous ? (
                        <Link href="/login"><a className="inline-block w-auto h-full">
                            <svg className="rounded h-full" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
                                {/* Thanks https://icons.getbootstrap.com/icons/person-fill/ (MIT) */}
                            </svg>
                        </a></Link>
                    ): /* default case, user status is unknown: */ (
                        <svg className="rounded h-full" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect width="16" height="16" /></svg>
                    )
                }
            </div>
        </header>

        <main role="main" className="absolute top-8 md:top-24 p-2 w-full bottom-0 overflow-y-auto">
            {props.children}
            {!props.hideFooter ? <SiteFooter site={props.site} /> : null}
        </main>
  </div>
};
