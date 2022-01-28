import React from 'react';
import { Icon, IconId } from './Icon';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: IconId;
}

export const Button: React.FunctionComponent<Props> = (props) => {
    return <button {...props} className="border-2 border-gray-500 rounded-md px-2 py-1 hover:shadow-sm hover:shadow-theme-link-color active:shadow-none m-[3px] active:ml-[4px] active:mt-[4px] active:mr-[2px] active:mb-[2px] disabled:text-gray-300 disabled:border-gray-200 disabled:hover:shadow-none disabled:cursor-not-allowed align-top">
        {props.icon && <Icon icon={props.icon}/>}
        {props.icon && " "}
        {props.children}
    </button>
}
