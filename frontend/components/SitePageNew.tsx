import React from 'react';
import Head from 'next/head'
import Link from 'next/link';

import { UserContext, UserStatus } from 'components/user/UserContext';
import { SiteData, useSiteData, api } from 'lib/api-client';
import { SiteFooter } from './SiteFooter';
import { UISlot, UISlotWidget, defaultRender } from './widgets/UISlot';
import FourOhFour from 'pages/404';
import { MDTContext, RenderMDT } from './markdown-mdt/mdt';
import { Icon, IconId } from './widgets/Icon';
import { FormattedMessage } from 'react-intl';

export const DefaultSiteTitle = Symbol("DefaultSiteTitle");

export interface SystemLink {
    /** The label of the link. Should be a FormattedMessage. */
    label: React.ReactElement;
    icon?: IconId;
    url: string;
}

interface Props {
    title: string | typeof DefaultSiteTitle;
    leftNavTopSlot?: UISlotWidget[];
    leftNavBottomSlot?: UISlotWidget[];
    footerSlot?: UISlotWidget[];
}

/**
 * Template for a "regular" Neolace page, for a specific site (e.g. foo.neolace.com), as opposed to the Neolace Admin UI
 */
export const SitePage: React.FunctionComponent<Props> = (props) => {
    const user = React.useContext(UserContext);
    const {site, siteError} = useSiteData();

    if (siteError instanceof api.NotFound) {
        return <FourOhFour/>;
    }

    const themeColor = (name: keyof NonNullable<typeof site.frontendConfig.theme>, defaultColor: [number, number, number])=> {
        const color: [number, number, number] = site.frontendConfig.theme?.[name] ?? defaultColor;
        return color.join(", ");
    };

    const systemLinks = <UISlot<SystemLink> slotId="leftNavTop" defaultContents={[
        //{id: "create", priority: 30, content: {url: "/draft/new/entry/new", label: <FormattedMessage id="systemLink.new" defaultMessage="Create new" />, icon: "plus-lg"}},
        {id: "login", priority: 60, content: {url: "/login", label: <FormattedMessage id="systemLink.login" defaultMessage="Login" />, icon: "person-fill"}},
    ]} renderWidget={(link: UISlotWidget<SystemLink>) => <Link key={link.id} href={link.content.url}><a><Icon icon={link.content.icon}/> {link.content.label}</a></Link>} />;

    return <div>
        <Head>
            <title>{props.title === DefaultSiteTitle ? site.name : `${props.title} - ${site.name}`}</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
            <link rel="icon" type="image/vnd.microsoft.icon" href="/favicon.ico"/>
            {/* Load "Inter Var" from rsms.me, which is served by CloudFlare CDN */}
            <link href="https://rsms.me/inter/inter.css" rel="stylesheet"/>
            {/* Load "Roboto Mono" as a variable font (:wght@100..700) from Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@100..700&amp;display=swap" rel="stylesheet"/>
            <style>{`
                :root {
                    --site-primary-color: 0, 255, 0;
                    --site-link-color: ${themeColor("linkColor", [0, 0, 0])};
                    --site-heading-color: ${themeColor("headingColor", [0, 0, 0])};
                }
            `}</style>
            {/* Analytics */}
            {site.frontendConfig.integrations?.plausibleAnalytics?.enabled ?
                <script defer data-domain={site.domain} src="https://plausible.io/js/plausible.js"></script>
            :null}
        </Head>

        {/* Main header: */}
        <header id="neo-main-header" className="bg-header-color w-screen h-8 md:h-24 flex flex-row flex-nowrap items-center">
            {/* Site name/logo */}
            <Link href="/">
                {/* there are lots of problems with getting an SVG logo to scale properly on safari; be sure to test any changes here thoroughly */}
                <a className="flex-none h-8 md:h-24 p-1 md:p-3 mr-1 flex items-center">
                    {
                        site.shortId ? <img alt={site.name} src={`/${site.shortId}.svg`} id="neo-site-logo" className="w-auto h-full block" /> : site.name
                    }
                </a>
            </Link>
            <div className="flex-1 min-w-0 items-center p-1 md:p-3 md:pl-0 text-header-color-light text-center text-sm md:text-lg"> {/* min-w-0 is required here per https://stackoverflow.com/a/66689926 */}
                {/* Site-Specific Nav Links */}
                <nav>
                    <ul className="flex justify-center">
                        {
                            // This styling will ensure that links other than the first two will be truncated if there is not enough room on screen to display them all in full.
                            site.frontendConfig.headerLinks?.map((link, idx) => 
                                <li key={idx} className={`inline-block mr-4 hover:text-gray-300 whitespace-nowrap ${idx >= 2 ? "overflow-hidden overflow-ellipsis" : ""}`}><Link href={link.href}><a>{link.text}</a></Link></li>
                            )
                        }
                    </ul>
                </nav>
                {/* Search */}
                {/* TODO - search box */}
            </div>
        </header>

        <main role="main" className="absolute top-8 md:top-24 p-2 w-full bottom-0 overflow-y-auto">
            {/* Container that wraps the left nav column (on desktop) and the article text/content */}
            {/* items-start is necessary on mobile to keep the top nav panel at the top when scrolling on long articles */}
            <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-row overflow-y-auto items-start scroll-padding-45 md:scroll-padding-none bg-gray-200">

                {/* Left column, which shows table of contents, but only on desktop */}
                <div id="left-toc-col" className="hidden md:flex w-1/4 max-w-[280px] bg-gray-300 xl:border-r border-r-gray-100 flex-initial p-4 overflow-y-auto flex-col sticky top-0 self-stretch">
                    <UISlot slotId="leftNavTop" defaultContents={props.leftNavTopSlot} renderWidget={defaultRender} />
                    <div className="flex-auto">{/* This is a spacer that pushes the "bottom" content to the end */}</div>
                    <UISlot slotId="leftNavTop" defaultContents={[...(props.leftNavBottomSlot ?? []), {
                        id: "systemLinks",
                        priority: 80,
                        content: systemLinks,
                    }]} renderWidget={defaultRender} />
                </div>

                {/* The main content of this entry */}
                <article id="entry-content" className="w-1/2 bg-white flex-auto p-6 z-0 max-w-[1000px] mx-auto shadow-md xl:my-6">{/* We have z-0 here because without it, the scrollbars appear behind the image+caption elements. */}
                    {props.children}
                    <footer className="mt-8 pt-1 text-gray-600 text-xs border-t border-t-gray-300 neo-typography clear-both">
                        <UISlot slotId="footer" defaultContents={[...(props.footerSlot ?? []), {
                            id: "siteFooter",
                            priority: 80,
                            content: <RenderMDT mdt={site.footerMD} context={new MDTContext({entryId: undefined})} />,
                        }]} renderWidget={defaultRender} />
                    </footer>
                </article>
            </div>
        </main>
    </div>;
};
