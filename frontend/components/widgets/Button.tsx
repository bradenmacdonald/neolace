import React from 'react';
import { Icon, IconId } from './Icon';
import { Tooltip } from './Tooltip';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: IconId;
    bold?: boolean;
}

export const Button: React.FunctionComponent<Props> = (props) => {
    return <button {...props} className={`border-2 border-gray-500 rounded-md px-2 py-1 hover:shadow-sm hover:shadow-theme-link-color active:shadow-none m-[3px] active:ml-[4px] active:mt-[4px] active:mr-[2px] active:mb-[2px] disabled:text-gray-300 disabled:border-gray-200 disabled:hover:shadow-none disabled:cursor-not-allowed align-top ${props.bold && "font-semibold"}`}>
        {props.icon && <Icon icon={props.icon}/>}
        {props.icon && " "}
        {props.children}
    </button>
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconId;
    title: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    enabled?: boolean;
    children?: never;
}

export const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({title, icon, enabled, onClick, ...props}) => {

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (onClick) {
            onClick(event);
        }
    }, [onClick]);

    return <Tooltip tooltipContent={<span>{title}</span>}>
        {attribs => <button {...props} {...attribs} aria-label={title} onClick={handleClick} className={`rounded-md px-2 py-1 hover:shadow-sm hover:shadow-gray-500 disabled:text-gray-300 disabled:hover:shadow-none disabled:cursor-not-allowed align-top ${enabled ? 'text-black' : 'text-gray-600'}`}>
            <span className={`${enabled ? "border-b-2 border-b-red-700" : ""}`}>
                <Icon icon={icon}/>
            </span>
        </button>
        }
    </Tooltip>
}
