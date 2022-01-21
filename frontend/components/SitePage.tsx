import React from 'react';
import Head from 'next/head'
import Link from 'next/link';

import { UserContext, UserStatus } from 'components/user/UserContext';
import { SiteData } from 'lib/api-client';
import { SiteFooter } from './SiteFooter';
import { SiteContext } from './SiteContext';

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

    return <SiteContext.Provider value={props.site}><div>
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
            {/* Analytics */}
            {props.site.frontendConfig.integrations?.plausibleAnalytics?.enabled ?
                <script defer data-domain={props.site.domain} src="https://plausible.io/js/plausible.js"></script>
            :null}
        </Head>

        {/* Main header: */}
        <header id="neo-main-header" className="bg-header-color w-screen h-8 md:h-24 flex flex-row flex-nowrap items-center">
            {/* Site name/logo */}
            <Link href="/">
                {/* there are lots of problems with getting an SVG logo to scale properly on safari; be sure to test any changes here thoroughly */}
                <a className="flex-none h-8 md:h-24 p-1 md:p-3 mr-1 flex items-center">
                    <img alt={props.site.name} src={`/${props.site.shortId}.svg`} id="neo-site-logo" className="w-auto h-full block" />
                </a>
            </Link>
            <div className="flex-1 min-w-0 items-center p-1 md:p-3 md:pl-0 text-header-color-light text-center text-sm md:text-lg"> {/* min-w-0 is required here per https://stackoverflow.com/a/66689926 */}
                {/* Site-Specific Nav Links */}
                <nav>
                    <ul className="flex justify-center">
                        {
                            // This styling will ensure that links other than the first two will be truncated if there is not enough room on screen to display them all in full.
                            props.site.frontendConfig.headerLinks?.map((link, idx) => 
                                <li key={idx} className={`inline-block mr-4 hover:text-gray-300 whitespace-nowrap ${idx >= 2 ? "overflow-hidden overflow-ellipsis" : ""}`}><Link href={link.href}><a>{link.text}</a></Link></li>
                            )
                        }
                    </ul>
                </nav>
                {/* Search */}
                {/* TODO - search box */}
            </div>
            <div className="flex-none flex flex-row items-center justify-center p-1 md:px-3 text-header-color-light">
                {
                    // Show the user's avatar if they're logged in, otherwise a placeholder link to the login page.
                    user.status === UserStatus.LoggedIn ? (
                        <img className="rounded max-h-100" alt="User Avatar" src="/avatar-unsplash-theyshane.jpg" />
                    ): user.status === UserStatus.Anonymous ? (
                        <Link href="/login"><a>
                            <svg className="rounded w-6 h-6 md:w-16 md:h-16" role="img" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
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
    </div></SiteContext.Provider>;
};
