import React from 'react';
import Head from 'next/head'
import Link from 'next/link';
import { SWRConfig } from 'swr';

import { UserContext, UserStatus } from 'components/user/UserContext';
import { SiteData, useSiteData, api } from 'lib/api-client';
import { UISlot, UISlotWidget, defaultRender } from './widgets/UISlot';
import FourOhFour from 'pages/404';
import { MDTContext, RenderMDT } from './markdown-mdt/mdt';
import { Icon, IconId } from './widgets/Icon';
import { FormattedMessage } from 'react-intl';
import { UiPluginsProvider } from './utils/ui-plugins';
import { DEVELOPMENT_MODE } from 'lib/config';

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
    /**
     * For a better user experience with no flash of unstyled content etc, use getStaticProps to preload the site data
     * and pass it in here.
     * 
     * However, if getStaticProps is not possible or doesn't make sense for a particular page, this can be set null and
     * the site details will be loaded on the client side.
     * 
     * See comments below in SitePage ("fallback") about looking for a better way to do this.
     */
    sitePreloaded: SiteData | null;
    children: React.ReactNode;
}

/**
 * Template for a "regular" Neolace page, for a specific site (e.g. foo.neolace.com), as opposed to the Neolace Admin UI
 */
export const SitePage: React.FunctionComponent<Props> = (props) => {
    const user = React.useContext(UserContext);
    const {site, siteError} = useSiteData(props.sitePreloaded ? {fallback: props.sitePreloaded} : {});

    // On mobile, we use JavaScript to show the menu when the user taps on the "Menu" button
    const [mobileMenuVisible, showMobileMenu] = React.useState(false);
    const toggleMobileMenu = React.useCallback(() => { showMobileMenu(!mobileMenuVisible); }, [mobileMenuVisible]);

    // On mobile, we need to hide the menu when a link is clicked, or when the user taps the screen elsewhere (not on the menu)
    const handleLeftPanelClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (mobileMenuVisible && event.target instanceof HTMLAnchorElement) {
            showMobileMenu(false);
        }
    }, [mobileMenuVisible, showMobileMenu]);
    // Likewise, hide the mobile menu if it's visible but the user taps off of it, on the article area
    const handleArticleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (mobileMenuVisible) { showMobileMenu(false); }
    }, [mobileMenuVisible, showMobileMenu]);

    if (siteError instanceof api.NotFound) {
        return <FourOhFour/>;
    }

    const themeColor = (name: keyof NonNullable<typeof site.frontendConfig.theme>, defaultColor: [number, number, number])=> {
        const color: [number, number, number] = site.frontendConfig.theme?.[name] ?? defaultColor;
        return color.join(", ");
    };

    // If getStaticProps has preloaded data about the current site, pass it in to SWR so it'll be immediately used
    // everywhere that we need site data. See https://swr.vercel.app/docs/with-nextjs
    // TODO: Ideally the logic to load this shouldn't need to be duplicated in each separate page. Follow
    //       https://github.com/vercel/next.js/discussions/10949 for updates on a better way to handle this.
    // Note that this fallback/SWRConfig only applies to child components, not _this_ SitePage component, which is why
    // we also pass "fallback" in to the useSiteData hook above.
    const fallback = props.sitePreloaded ? {[`site:${props.sitePreloaded.domain}`]: props.sitePreloaded} : {};

    const defaultSystemLinks: UISlotWidget<SystemLink>[] = [];
    //{id: "create", priority: 30, content: {url: "/draft/new/entry/new", label: <FormattedMessage id="systemLink.new" defaultMessage="Create new" />, icon: "plus-lg"}},

    if (DEVELOPMENT_MODE) {
        // For now, the "Drafts" link should only be visible during development
        defaultSystemLinks.push(
            {
                id: "create-entry",
                priority: 25,
                content: {
                    url: "/draft/_/entry/_/edit",
                    label: <FormattedMessage id="systemLink.createEntry" defaultMessage="Create Entry" />,
                    icon: "plus-lg",
                },
            },
            {
                id: "drafts",
                priority: 30,
                content: {
                    url: "/draft/",
                    label: <FormattedMessage id="systemLink.drafts" defaultMessage="Drafts" />,
                    icon: "file-earmark-diff",
                },
            },
        );
    }
    
    if (user.status === UserStatus.LoggedIn) {
        // My Profile link
        defaultSystemLinks.push({
            id: "profile",
            priority: 55,
            content: {
                url: site.isHomeSite ? "/account/" : `${site.homeSiteUrl}/account/`,
                label: <FormattedMessage id="systemLink.profile" defaultMessage="Profile ({name})" values={{name: user.fullName}} />,
                icon: "person-fill",
            }
        });
        // Log out link:
        defaultSystemLinks.push({
            id: "login-out",
            priority: 60,
            content: {
                url: site.isHomeSite ? "/account/logout" : `${site.homeSiteUrl}/account/logout?returnSite=${encodeURI(site.shortId)}`,
                label: <FormattedMessage id="systemLink.logout" defaultMessage="Log out" />,
                icon: "door-closed",
            }
        });
    } else {
        // Log in link:
        defaultSystemLinks.push({
            id: "login-out",
            priority: 60,
            content: {
                url: site.isHomeSite ? "/account/login" : `${site.homeSiteUrl}/account/login?returnSite=${encodeURI(site.shortId)}`,
                label: <FormattedMessage id="systemLink.login" defaultMessage="Log in" />,
                icon: "person-fill",
            }
        });
    }

    // The system links, which are in the bottom left corner
    const systemLinks = (
        <ul>
            <UISlot<SystemLink>
                slotId="systemLinks"
                defaultContents={defaultSystemLinks}
                renderWidget={
                    (link: UISlotWidget<SystemLink>) => (
                        <li key={link.id}>
                            <Link href={link.content.url}><a>
                                <Icon icon={link.content.icon}/> {link.content.label}
                            </a></Link>
                        </li>
                    )
                }
            />
        </ul>
    );

    return <SWRConfig value={{ fallback }}><UiPluginsProvider site={site}><div>
        <Head>
            <title>{props.title === DefaultSiteTitle ? site.name : `${props.title} - ${site.name}`}</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
            <link rel="icon" type="image/vnd.microsoft.icon" href="/favicon.ico"/>
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

        {/* Container that wraps the left nav column (on desktop) and the article text/content */}
        <div className="flex flex-row justify-center mx-auto shadow-lg w-screen md:max-w-[1280px]">

            {/* Left column, which shows various links and the current page's table of contents. On mobile it's hidden until the user clicks "Menu". */}
            <div
                id="left-panel"
                className={
                    `${mobileMenuVisible ? `translate-x-0 visible z-[100]` : `-translate-x-[100%] invisible`}
                    transition-visibility-transform md:visible md:translate-x-0
                    fixed md:sticky
                    flex
                    top-0 left-0 bottom-8 md:bottom-0 w-[80vw] md:w-1/4 md:max-w-[280px] 
                    bg-transparent
                    flex-initial p-4 overflow-y-auto flex-col self-stretch
                    md:h-[100vh]
                    bg-slate-100
                `}
                onClick={handleLeftPanelClick}
            >

                {/* Site name/logo */}
                <Link href="/">
                    {/* there are lots of problems with getting an SVG logo to scale properly on safari; be sure to test any changes here thoroughly */}
                    <a className="flex-none p-1 mr-1 flex items-center mb-3">
                        {
                            // eslint-disable-next-line @next/next/no-img-element
                            site.shortId ? <img alt={site.name} src={`/${site.shortId}.svg`} id="neo-site-logo" className="w-full h-auto block" /> : site.name
                        }
                    </a>
                </Link>

                <UISlot slotId="leftNavTop" defaultContents={[...(props.leftNavTopSlot ?? []), {
                    id: "siteLinks",
                    priority: 15,
                    content: <>
                        <ul>
                            {site.frontendConfig.headerLinks?.map(link => 
                                <li key={link.href}><Link href={link.href}>{link.text}</Link></li>
                            )}
                        </ul>
                    </>,
                }]} renderWidget={defaultRender} />
                <div className="flex-auto">{/* This is a spacer that pushes the "bottom" content to the end */}</div>
                <UISlot slotId="leftNavBottom" defaultContents={[...(props.leftNavBottomSlot ?? []), {
                    id: "systemLinks",
                    priority: 80,
                    content: systemLinks,
                }]} renderWidget={defaultRender} />
            </div>

            {/* The main content of this entry */}
            <main role="main" id="content" className="w-full left-0 top-0 md:w-1/2 bg-white flex-auto p-6 z-0 max-w-[1000px] neo-typography" onClick={handleArticleClick}>{/* We have z-0 here because without it, the scrollbars appear behind the image+caption elements. */}
                <div className="md:min-h-[calc(100vh-11.5rem)]"> {/* Push the footer down to the bottom if the page content is very short */}
                    {props.children}
                </div>
                <footer className="mt-8 pt-1 text-gray-600 text-xs border-t border-t-gray-300 clear-both">
                    <UISlot slotId="footer" defaultContents={[...(props.footerSlot ?? []), {
                        id: "siteFooter",
                        priority: 80,
                        content: <RenderMDT mdt={site.footerMD} context={new MDTContext({entryId: undefined})} />,
                    }]} renderWidget={defaultRender} />
                </footer>
                <div className='h-8 md:h-0'>{/* Padding on mobile that goes behind the bottom footer */}</div>
            </main>
        </div>
        {/* The "floating" footer on mobile that can be used to bring up the menu */}
        <div className="fixed md:hidden bg-header-color text-white bottom-0 h-8 left-0 right-0">
            <button className="h-8 px-3" onClick={toggleMobileMenu}>
                <Icon icon="list" />{" "}
                <FormattedMessage id="mobileFooter.menuButton" defaultMessage="Menu" />
            </button>
        </div>
    </div></UiPluginsProvider></SWRConfig>;
};
