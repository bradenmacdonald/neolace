import { useIntl } from "react-intl";
import { displayString, TranslatableString } from "components/utils/i18n";
import { Icon, IconId } from "./Icon";
import { UISlot, UISlotWidget } from "./UISlot";
import Link from "next/link";


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
}

export const LeftPanelLinkSet: React.FC<Props> = (props) => {

    const intl = useIntl();

    const contents = <UISlot<Link>
        slotId={props.slotId}
        defaultContents={props.links}
        renderWidget={
            (link: UISlotWidget<Link>) => (
                <Link href={link.content.url} key={link.id} className="block rounded-md px-2 py-2 [&>svg]:mr-2 truncate text-slate-600 hover:text-black hover:bg-slate-200">
                    {props.hasIcons ? <Icon icon={link.content.icon}/> : null}{link.content.label}
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
