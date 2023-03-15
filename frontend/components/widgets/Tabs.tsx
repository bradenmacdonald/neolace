/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import React from "react";
import { useRouter } from "next/router";
import { displayText, TranslatableText } from "components/utils/i18n";
import { Icon, IconId } from "./Icon";

// Helper types to require child element of a certain type:
type PropsOf<T> = T extends React.FunctionComponent<infer P> ? P : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChildOfType<T extends React.JSXElementConstructor<any>> = React.ReactElement<PropsOf<T>, T>;

export interface TabProps {
    icon?: IconId;
    id: string;
    name: TranslatableText;
    /** A number/count to show after the name of the tab, e.g. if the tab is "Email" and you have 3 unread emails. */
    badge?: string;
    children?: React.ReactNode;
    /** This is for internal use to notify <TabBar> of clicks on each <Tab> */
    _onTabClick?: (tabId: string) => void;
    _isCurrentTab?: boolean;
    /** If this is true, the tab is not rendered at all. */
    hidden?: boolean;
}

export const Tab: React.FunctionComponent<TabProps> = (props) => {
    const isCurrentTab = props._isCurrentTab;

    const parentHandler = props._onTabClick;
    const handleClick = React.useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        parentHandler?.(props.id);
    }, [parentHandler, props.id]);

    return (
        <li
            className="mr-2"
            role="tab"
            id={`tab-${props.id}`}
            aria-controls={`tabpanel-${props.id}`}
            aria-selected={isCurrentTab}
        >
            <a
                href={`#${props.id}`}
                onClick={handleClick}
                className={`
                    unstyled
                    inline-flex px-3 py-3
                    border-b-2 text-base
                    ${isCurrentTab ? "text-sky-800 border-b-sky-800" : "text-gray-600 hover:text-sky-600"}
                    border-transparent
                `}
            >
                <>
                    {props.icon
                        ? (
                            <span className="mr-2">
                                <Icon icon={props.icon} />
                            </span>
                        )
                        : null}
                    {displayText(props.name)}
                    {props.badge
                        ? <span className="text-sm rounded-2xl bg-slate-100 px-2 mx-2 leading-6">{props.badge}</span>
                        : null}
                </>
            </a>
        </li>
    );
};

export interface TabBarProps {
    activeTab: string;
    onTabClick: (tabId: string) => void;
    children: ChildOfType<typeof Tab> | ChildOfType<typeof Tab>[];
}

export const TabBar: React.FunctionComponent<TabBarProps> = (props) => {
    const tabs = Array.isArray(props.children) ? props.children : [props.children];

    return (
        <>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <ul className="unstyled flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
                    {tabs.map((tab) =>
                        tab.props.hidden ? null :
                        React.cloneElement(tab, {
                            key: tab.props.id,
                            _onTabClick: props.onTabClick,
                            _isCurrentTab: tab.props.id === props.activeTab,
                        })
                    )}
                </ul>
            </div>
            {tabs.map((tab) => (
                tab.props.hidden ? null :
                <div
                    key={tab.props.id}
                    role="tabpanel"
                    id={`tabpanel-${tab.props.id}`}
                    tabIndex={0}
                    aria-labelledby={`tab-${tab.props.id}`}
                    className={tab.props.id === props.activeTab ? "" : "hidden"}
                >
                    {tab.props.children}
                </div>
            ))}
        </>
    );
};

/** If running in a browser, get the #hash from the URL, excluding the "#" itself. */
function getHash() {
    if (typeof window !== "undefined") {
        if (window.location.hash) {
            return window.location.hash.substring(1);
        }
    }
    return "";
}

export interface TabBarHashProps {
    /** Which query param keeps track of the current tab, e.g. ?tab=main then "tab" is the queryParam */
    queryParam?: string;
    children: TabBarProps["children"];
}

/**
 * A tab bar that uses the ?query part of the URL to keep track of which tab we're on.
 */
export const TabBarRouter: React.FunctionComponent<TabBarHashProps> = (props) => {
    const router = useRouter();
    const tabs = Array.isArray(props.children) ? props.children : [props.children];

    const param = props.queryParam ?? "tab";
    const firstTabId = tabs[0]?.props.id ?? "";
    let activeTab = router.query?.[param];
    if (typeof activeTab !== "string" || !tabs.find((tab) => tab.props.id === activeTab)) {
        // That tab was invalid, so just default to the first tab:
        activeTab = firstTabId;
    }

    const handleTabClick = React.useCallback((tabId: string) => {
        const newQuery = tabId === firstTabId ? "" : `?${param}=${tabId}`;
        router.push(`${window.location.pathname}${newQuery}`, undefined, { shallow: true });
    }, [router, param, firstTabId]);

    return <TabBar activeTab={activeTab} onTabClick={handleTabClick}>{props.children}</TabBar>;
};
