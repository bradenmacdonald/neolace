import React from "react";
import { defineMessage, displayText, TranslatableString } from "components/utils/i18n";
import { SiteUsersAdminTool } from "./UsersAdmin";
import { FormattedMessage } from "react-intl";
import Link from "next/link";
import { Icon, IconId } from "components/widgets/Icon";

export interface AdminComponentProps {
    matchedPath: RegExpMatchArray;
}


/**
 * Definition of one of the site admin screens
 */
export interface SiteAdminTool {
    id: string;
    name: TranslatableString;
    icon: IconId;
    /** When users click the link to access this admin tool, go to /admin/[mainPath] */
    mainPath: "users",
    /** A RegExp matching the URLs that are handled by this admin tool. e.g. /^foo$/ to access it /admin/foo */
    matchPath: RegExp;
    component: React.FunctionComponent<AdminComponentProps>;
}

export const builtInAdminTools: SiteAdminTool[] = [
    {
        id: "users",
        name: defineMessage({defaultMessage: "Users", id: "YDMrKK"}),
        icon: "people-fill",
        mainPath: "users",
        matchPath: /^users$/,
        component: SiteUsersAdminTool,
    },
];

export const AdminLinks: React.FunctionComponent = (props) => {

    return <>
        <div className="mt-2 pt-2 border-t border-slate-300">
            <span className="text-slate-500 uppercase text-xs"><FormattedMessage defaultMessage="Site Administration" id="iOBTBR" /></span>
            <ul>
                {builtInAdminTools.map((t) => (
                    <li key={t.id}>
                        <Link href={`/admin/${t.mainPath}`}>
                            <Icon icon={t.icon}/> {displayText(t.name)}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    </>
};