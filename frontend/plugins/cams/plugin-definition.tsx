import React from "react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { PluginDefinition } from "components/utils/ui-plugins";
import { UiChangeOperation } from "components/widgets/UISlot";
import type { HouseOfSecurityProps } from "./plugin-components/HouseOfSecurity";
import { Spinner } from "components/widgets/Spinner";
import { usePermission } from "lib/api";
import { CorePerm } from "neolace-api";

// These are loaded dynamically to keep the plugin definition script as small as possible, since all plugin definitions
// are loaded and sent to the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HeaderNavModal = dynamic<any>(() =>
    import(`./plugin-components/HeaderNavModal`).then((mod) => mod.HeaderNavModal),
    { ssr: false },
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MembersOnlyNotice = dynamic<any>(() =>
    import(`./plugin-components/MembersOnlyNotice`).then((mod) => mod.MembersOnlyNotice),
);
// Ideally we shouldn't need 'ssr: false' nor 'loading: ...' here, and we could set {suspense: true} and use
// <React.Suspense fallback={<Spinner/>}><HouseOfSecurity/></React.Suspense> below, but it currently doesn't work
// because the <LookupValue/> component calls useSiteData() which uses useSWR() without {suspense: true}
// https://github.com/vercel/swr/issues/1906
// Basically, we need to wait until the story around using SWR with Suspense is better defined, and Suspense is less
// experimental.
const HouseOfSecurity = dynamic<HouseOfSecurityProps>(
    () => import(`./plugin-components/HouseOfSecurity`).then((mod) => mod.HouseOfSecurity),
    { ssr: false, loading: () => <><Spinner/></> },
);

/** This is a React widget that wraps the system links in the bottom left and hides them */
const HideExceptForAdmin: React.FC<{widget: React.ReactElement}> = ({widget}) => {
    const key = widget.key;
    const hasEditPermission = usePermission(CorePerm.proposeNewEntry);
    return <React.Fragment key={key}>{hasEditPermission ? widget : null}</React.Fragment>;
}


export const plugin: PluginDefinition = {
    id: "cams",
    getPageForPath(_site, path) {
        if (path === "/research-briefs") {
            return "research-briefs";
        } else if (path === "/posters-presentations") {
            return "posters-presentations";
        } else if (path === "/early-papers") {
            return "early-papers";
        } else if (path === "/members-only") {
            return "members-only";
        } else if (path === "/members-login") {
            return "members-login";
        }
        return undefined;
    },
    getUiSlotChanges() {
        return {
            "leftNavTop": [
                // Hide the normal main links:
                {
                    op: UiChangeOperation.Wrap,
                    widgetId: "mainLinks",
                    wrapper: HideExceptForAdmin,
                },
            ],
            "leftNavBottom": [
                // Hide the normal system links, because we don't want users clicking "login" and going to the realm home site:
                {
                    op: UiChangeOperation.Wrap,
                    widgetId: "systemLinks",
                    wrapper: HideExceptForAdmin,
                },
            ],
            "globalHeader": [
                {
                    op: UiChangeOperation.Insert,
                    widget: {
                        id: "cams-header",
                        priority: 1,
                        content: (
                            <>
                                {/* Adjust the scroll padding so that #anchor links scroll far enough that the header doesn't block the content */}
                                <Head>
                                    <style>
                                        {`html, body { scroll-padding-top: 80px; }`}
                                    </style>
                                </Head>
                                <div className="fixed w-full z-[2] bg-black h-[72px]">
                                    <div className="max-w-[1080px] mx-auto h-full flex justify-between">
                                        <a href="https://cams.mit.edu/">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                className="h-full mx-[4px]"
                                                alt="MIT CAMS"
                                                src="/pl/cams/cams-header-logo.png"
                                            />
                                        </a>
                                        <HeaderNavModal/>
                                    </div>
                                </div>
                            </>
                        ),
                    },
                },
            ],
            "siteLogo": [
                {
                    op: UiChangeOperation.Insert,
                    widget: { id: "cams-header-spacer", priority: 1, content: <div className="h-[72px]"></div> },
                },
            ],
            "preContent": [
                {
                    op: UiChangeOperation.Insert,
                    widget: { id: "cams-header-spacer", priority: 1, content: <div className="h-[72px]"></div> },
                },
            ],
            "entryPreFeature": [
                {
                    op: UiChangeOperation.Insert,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    widget: { id: "cams-members-only-notice", priority: 10, content: <MembersOnlyNotice /> },
                },
            ],
        };
    },
    overrideLookupValue(config, value) {
        if (value.type === "String" && value.value === "$CAMS_HOUSE_OF_SECURITY$") {
            return <><HouseOfSecurity/></>;
        }
        return undefined;
    },
};
