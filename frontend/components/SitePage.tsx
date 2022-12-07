import React from "react";
import Head from "next/head";
import Link from "next/link";

import { api, usePermissions, useSiteData, UserStatus, useUser } from "lib/api";
import { defaultRender, DefaultUISlot, UISlot, UISlotWidget } from "./widgets/UISlot";
import FourOhFour from "pages/404";
import { MDTContext, RenderMDT } from "./markdown-mdt/mdt";
import { Icon, IconId } from "./widgets/Icon";
import { FormattedMessage, useIntl } from "react-intl";
import { UiPluginsContext } from "./utils/ui-plugins";
import { DEVELOPMENT_MODE } from "lib/config";
import { defineMessage, displayString, TranslatableString } from "./utils/i18n";
import { SiteDataProvider } from "./SiteDataProvider";
import { useZIndex, IncreaseZIndex, ZIndexContext } from "lib/hooks/useZIndex";
import { LeftPanelLinkSet } from "./widgets/LeftPanelLinkSet";
export { SiteDataProvider }  // for convenience, allow SitePage and SiteDataProvider to both be imported together


export const DefaultSiteTitle = Symbol("DefaultSiteTitle");

export interface LinkWithIcon {
    /** The label of the link. Should be a FormattedMessage. */
    label: React.ReactElement;
    icon?: IconId;
    url: string;
}

interface Props {
    title: TranslatableString | string | typeof DefaultSiteTitle;
    leftNavTopSlot?: UISlotWidget[];
    leftNavBottomSlot?: UISlotWidget[];
    footerSlot?: UISlotWidget[];
    children: React.ReactNode;
}

/**
 * Template for a "regular" Neolace page, for a specific site (e.g. foo.neolace.com), as opposed to the Neolace Admin UI
 */
export const SitePage: React.FunctionComponent<Props> = (props) => {
    const intl = useIntl();
    const user = useUser();
    const { site, siteError } = useSiteData();
    const pluginsData = React.useContext(UiPluginsContext);
    const permissions = usePermissions();

    // On mobile, we use JavaScript to show the menu when the user taps on the "Menu" button
    const [mobileMenuVisible, showMobileMenu] = React.useState(false);
    const toggleMobileMenu = React.useCallback(() => {
        showMobileMenu(!mobileMenuVisible);
    }, [mobileMenuVisible]);

    // On mobile, we need to hide the menu when a link is clicked, or when the user taps the screen elsewhere (not on the menu)
    const handleLeftPanelClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (mobileMenuVisible && event.target instanceof HTMLAnchorElement) {
            showMobileMenu(false);
        }
    }, [mobileMenuVisible, showMobileMenu]);
    // Likewise, hide the mobile menu if it's visible but the user taps off of it, on the article area
    const handleArticleClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (mobileMenuVisible) showMobileMenu(false);
    }, [mobileMenuVisible, showMobileMenu]);

    // If we're in a mobile view and the left menu is active, it needs to be in front of absolutely everything.
    const leftMenuZIndex = useZIndex({increaseBy: mobileMenuVisible ? IncreaseZIndex.ForMobileMenu : IncreaseZIndex.NoChange});

    if (siteError instanceof api.NotFound) {
        return <FourOhFour />;
    }

    const themeColor = (
        name: keyof NonNullable<typeof site.frontendConfig.theme>,
        defaultColor: [number, number, number],
    ) => {
        const color: [number, number, number] = site.frontendConfig.theme?.[name] ?? defaultColor;
        return color.join(" ");
    };

    const defaultMainLinks: UISlotWidget<LinkWithIcon>[] = [];
    const defaultSystemLinks: UISlotWidget<LinkWithIcon>[] = [];

    defaultMainLinks.push(
        // Home page
        {
            id: "home",
            priority: 5,
            content: {
                url: "/",
                label: <FormattedMessage id="ejEGdx" defaultMessage="Home" />,
                icon: "house-fill",
            },
        },
        // Run a "lookup" query and see the result:
        {
            id: "lookup",
            priority: 22,
            content: {
                url: "/lookup",
                label: <FormattedMessage id="VzW9jr" defaultMessage="Lookup" />,
                icon: "asterisk",
            },
        },
        // Create a new entry:
        {
            id: "create-entry",
            priority: 25,
            content: {
                url: "/draft/_/entry/_/edit",
                label: <FormattedMessage id="oTIZFX" defaultMessage="Create Entry" />,
                icon: "plus-lg",
            },
            // Only show if the user has permission to propose a new entry:
            hidden: !permissions?.[api.CorePerm.proposeNewEntry]?.hasPerm,
        },
        // See drafts:
        {
            id: "drafts",
            priority: 30,
            content: {
                url: "/draft/",
                label: <FormattedMessage id="2atspc" defaultMessage="Drafts" />,
                icon: "file-earmark-diff",
            },
        },
    );


    defaultSystemLinks.push(
        // Site administration:
        {
            id: "admin",
            priority: 30,
            content: {
                url: `/admin/`,
                label: <FormattedMessage id="iOBTBR" defaultMessage="Site Administration" />,
                icon: "gear-fill",
            },
            // Only show if the user has permission to administer the site:
            hidden: !permissions?.[api.CorePerm.siteAdmin]?.hasPerm,
        }
    );
    if (user.status === UserStatus.LoggedIn) {
        // My Profile link
        defaultSystemLinks.push({
            id: "profile",
            priority: 40,
            content: {
                url: site.isHomeSite ? "/account/" : `${site.homeSiteUrl}/account/`,
                label: <FormattedMessage id="/GfBD6" defaultMessage="Profile ({name})" values={{name: user.fullName}} />,
                icon: "person-fill",
            },
        });
        // Log out link:
        defaultSystemLinks.push({
            id: "logout",
            priority: 60,
            content: {
                url: site.isHomeSite ? "/account/logout" : `${site.homeSiteUrl}/account/logout?returnSite=${encodeURI(site.key)}`,
                label: <FormattedMessage id="PlBReU" defaultMessage="Log out" />,
                icon: "door-closed",
            }
        });
    } else {
        // Log in link:
        defaultSystemLinks.push({
            id: "login",
            priority: 60,
            content: {
                url: site.isHomeSite ? "/account/login" : `${site.homeSiteUrl}/account/login?returnSite=${encodeURI(site.key)}`,
                label: <FormattedMessage id="odXlk8" defaultMessage="Log in" />,
                icon: "person-fill",
            }
        });
    }

    const title = (
        props.title === DefaultSiteTitle ? site.name :
        typeof props.title === "string" ? `${props.title} - ${site.name}` :
        displayString(intl, props.title) + ` - ${site.name}`
    );

    const content = <div>
        <Head>
            <title>{title}</title>
            <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
            <link rel="icon" type="image/vnd.microsoft.icon" href="/favicon.ico"/>
            <style>{`
                :root {
                    --site-primary-color: 0 255 0;
                    --site-link-color: ${themeColor("linkColor", [0, 0, 0])};
                    --site-heading-color: ${themeColor("headingColor", [0, 0, 0])};
                }
            `}</style>
            {/* Analytics */}
            {site.frontendConfig.integrations?.plausibleAnalytics?.enabled ?
                <script defer data-domain={site.domain} src="https://plausible.io/js/plausible.js"></script>
            :null}
        </Head>

        {/* If plugins want to render a header (e.g. for theming purposes), they can. By default there is no full-width header. */}
        <DefaultUISlot slotId="globalHeader"/>

        {/* Container that wraps the left nav column (on desktop) and the article text/content */}
        <div className="flex flex-row justify-center mx-auto w-screen md:max-w-[1280px] shadow-lg bg-white">

            {/* Left column, which shows various links and the current page's table of contents. On mobile it's hidden until the user clicks "Menu". */}
            <div
                id="left-panel"
                className={
                    `${mobileMenuVisible ? `translate-x-0 visible` : `-translate-x-[100%] invisible`}
                    transition-visibility-transform md:visible md:translate-x-0
                    fixed md:sticky
                    flex
                    top-0 left-0 bottom-8 md:bottom-0 w-[80vw] md:w-1/4 md:max-w-[280px]
                    bg-white border-r border-slate-200
                    flex-initial p-4 overflow-y-auto flex-col self-stretch
                    md:h-[100vh]
                    space-y-2
                `}
                style={{zIndex: leftMenuZIndex}}
                onClick={handleLeftPanelClick}
            >
                <ZIndexContext.Provider value={leftMenuZIndex}>
                    {/* Site name/logo */}
                    <DefaultUISlot slotId="siteLogo">
                        <Link
                            href="/"
                            className="flex-none p-1 mr-1 flex items-center mb-3 -indent-1 font-bold text-lg"
                        >
                            {/* there are lots of problems with getting an SVG logo to scale properly on safari; be sure to test any changes here thoroughly */}
                            {
                                // eslint-disable-next-line @next/next/no-img-element
                                site.key ? <img alt={site.name} src={`/${site.key}.svg`} id="neo-site-logo" className="w-full h-auto block" /> : site.name
                            }
                        </Link>
                    </DefaultUISlot>

                    <UISlot slotId="leftNavTop" defaultContents={[
                        ...(props.leftNavTopSlot ?? []),
                        {
                            id: "mainLinks",
                            priority: 10,
                            content: <LeftPanelLinkSet
                                label={defineMessage({defaultMessage: "Main links", id: "mjbNQV"})}
                                slotId="mainLinks"
                                links={defaultMainLinks}
                                hasIcons
                            />,
                        },
                        // {
                        //     id: "siteLinks",
                        //     priority: 25,
                        //     content: <>
                        //         <ul>
                        //             {site.frontendConfig.headerLinks?.map(link => 
                        //                 <li key={link.href}><Link href={link.href}>{link.text}</Link></li>
                        //             )}
                        //         </ul>
                        //     </>,
                        // },
                    ]} renderWidget={defaultRender} />
                    <div className="flex-auto">{/* This is a spacer that pushes the "bottom" content to the end */}</div>
                    <UISlot slotId="leftNavBottom" defaultContents={[
                        ...(props.leftNavBottomSlot ?? []),
                        {
                            id: "systemLinks",
                            priority: 40,
                            content: <LeftPanelLinkSet
                                label={defineMessage({defaultMessage: "System links", id: "ziRyNh"})}
                                slotId="systemLinks"
                                links={defaultSystemLinks}
                                hasIcons
                            />,
                        },
                    ]} renderWidget={defaultRender} />
                </ZIndexContext.Provider>
            </div>

            <div className="flex-auto flex flex-col w-full left-0 top-0 md:w-1/2 z-0 max-w-[1000px] neo-typography">
                {/* The main content of this entry */}
                <main role="main" id="content" className="bg-white p-6" onClick={handleArticleClick}>{/* We have z-0 here because without it, the scrollbars appear behind the image+caption elements. */}
                    <DefaultUISlot slotId="preContent"/>
                    {props.children}
                </main>
                <div className="flex-auto clear-both">{/* This is a spacer that pushes the footer to the end if the <main> above doesn't at least fill the screen */}</div>
                <footer className="mt-8 p-6 text-gray-600 text-xs">
                    <UISlot slotId="footer" defaultContents={[...(props.footerSlot ?? []), {
                        id: "siteFooter",
                        priority: 80,
                        content: <RenderMDT mdt={site.footerContent} context={new MDTContext({entryId: undefined})} />,
                    }]} renderWidget={defaultRender} />
                </footer>
                <div className='h-8 md:h-0'>{/* Padding on mobile that goes behind the bottom footer */}</div>
            </div>
        </div>
        {/* The "floating" footer on mobile that can be used to bring up the menu */}
        <div className="fixed md:hidden bg-header-color text-white bottom-0 h-8 left-0 right-0">
            <button className="h-8 px-3" onClick={toggleMobileMenu}>
                <Icon icon="list" />{" "}
                <FormattedMessage id="tKMlOc" defaultMessage="Menu" />
            </button>
        </div>
    </div>;

    // Automatically inject SiteDataProvider if necessary:
    return pluginsData.loaded ? content : <SiteDataProvider sitePreloaded={null}>{content}</SiteDataProvider>;
};
