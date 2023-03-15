/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { useIntl } from "react-intl";
import { displayString, TranslatableString } from "components/utils/i18n";
import { Icon, IconId } from "./Icon";
import { UISlot, UISlotWidget } from "./UISlot";
import Link from "next/link";
import { useRouter } from "next/router";


export interface Props {
    hasIcons?: boolean;
    slotId: string;
    label: TranslatableString;
    showLabel?: boolean;
    links: UISlotWidget<Link>[];
}

export interface Link {
    /** The label of the link. Should be a FormattedMessage. */
    label: React.ReactElement;
    icon?: IconId;
    url: string;
    matchUrl?: string;
}

export const LeftPanelLinkSet: React.FC<Props> = (props) => {

    const intl = useIntl();
    const {asPath: currentUrl} = useRouter();

    const isActive = (url: string) => {
        if (url.includes("#")) return false; // TODO: support this in the future
        if (url === "/") return currentUrl === url;
        if (currentUrl === url) return true;
        if (url.endsWith('/')) return currentUrl.startsWith(url);
        return currentUrl.startsWith(`${url}/`) || currentUrl.startsWith(`${url}?`);
    }

    const contents = <UISlot<Link>
        slotId={props.slotId}
        defaultContents={props.links}
        renderWidget={
            (link: UISlotWidget<Link>) => (
                <Link
                    href={link.content.url}
                    key={link.id}
                    className={`
                        block rounded-md px-2 py-2 [&>svg]:mr-2 truncate
                        ${isActive(link.content.matchUrl ?? link.content.url) ? `bg-slate-100 text-slate-800` : `text-slate-600 hover:text-black hover:bg-slate-50`}
                    `}>
                    {props.hasIcons ? <Icon icon={link.content.icon}/> : null} {link.content.label}
                </Link>
            )
        }
    />;


    return props.showLabel ?
        <div className="pt-4">
            <h3 className="px-2 text-sm font-medium antialiased text-slate-500" id={`${props.slotId}-heading`}>
                {displayString(intl, props.label)}
            </h3>
            <nav id="table-of-contents-links" aria-labelledby="toc-heading">
                {contents}
            </nav>
        </div>
    :
        <nav className="space-y-1" aria-label={displayString(intl, props.label)}>
            {contents}
        </nav>
}
