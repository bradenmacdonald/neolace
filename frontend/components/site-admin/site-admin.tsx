import React from "react";
import { defineMessage, displayText, TranslatableString } from "components/utils/i18n";
import { FormattedMessage } from "react-intl";
import Link from "next/link";
import { Icon, IconId } from "components/widgets/Icon";
import { SiteUsersAdminTool } from "./UsersAdmin";
import { SiteSettingsAdminTool } from "./SiteSettings";

export interface AdminComponentProps {
    /** If this admin tool has its own sub-URLs, this provides that info. e.g. for /admin/foo/bar this is ["bar"] */
    subPath: string[];
}


/**
 * Definition of one of the site admin screens
 */
export interface SiteAdminTool {
    id: string;
    name: TranslatableString;
    icon: IconId;
    component: React.FunctionComponent<AdminComponentProps>;
}

export const builtInAdminTools: SiteAdminTool[] = [
    {
        id: "users",
        name: defineMessage({defaultMessage: "Users", id: "YDMrKK"}),
        icon: "people-fill",
        component: SiteUsersAdminTool,
    },
    {
        id: "settings",
        name: defineMessage({defaultMessage: "Settings", id: 'D3idYv'}),
        icon: "gear-fill",
        component: SiteSettingsAdminTool,
    },
];

export const AdminLinks: React.FunctionComponent = (props) => {

    return <>
        <div className="mt-2 pt-2 border-t border-slate-300">
            <span className="text-slate-500 uppercase text-xs"><FormattedMessage defaultMessage="Site Administration" id="iOBTBR" /></span>
            <ul>
                {builtInAdminTools.map((t) => (
                    <li key={t.id}>
                        <Link href={`/admin/${t.id}`}>
                            <Icon icon={t.icon}/> {displayText(t.name)}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    </>
};