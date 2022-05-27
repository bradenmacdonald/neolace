import React from 'react';
import { Icon, IconId } from './Icon';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: IconId;
    inputRef?: React.Ref<HTMLInputElement>
}

export const TextInput: React.FunctionComponent<Props> = (props) => {

    const {icon, inputRef, className: customClass, ...overrideInputProps} = props;

    const inputProps = {type: "text", ...overrideInputProps};

    return <div
        className={`border border-gray-500 rounded-md inline-flex items-center focus-within:ring-2 ring-theme-link-color overflow-hidden my-[3px] w-[600px] max-w-full ${customClass}`}
        onClick={(ev) => ev.currentTarget.querySelector("input")?.focus()}
    >
        {
            icon && <div className="pl-3 pr-1 inline-block text-gray-600 flex-none">
                <Icon icon={icon} />
            </div>
        }
        <input {...inputProps} className="outline-none border-none px-2 py-1 flex-auto" ref={inputRef} />
    </div>
}
