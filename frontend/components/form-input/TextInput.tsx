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
import { Icon, IconId } from "../widgets/Icon";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: IconId;
    inputRef?: React.Ref<HTMLInputElement>;
}

/**
 * A text input box, i.e. <input type="text">
 */
export const TextInput: React.FunctionComponent<Props> = (props) => {
    const { icon, inputRef, className: customClass, ...overrideInputProps } = props;

    const inputProps = { type: "text", ...overrideInputProps };

    return (
        <div
            className={`border border-gray-500 rounded-md inline-flex items-center focus-within:ring-2 ring-theme-link-color overflow-hidden my-[3px] w-[600px] max-w-full ${customClass}`}
            onClick={(ev) => ev.currentTarget.querySelector("input")?.focus()}
        >
            {icon && (
                <div className="pl-3 pr-1 inline-block text-gray-600 flex-none">
                    <Icon icon={icon} />
                </div>
            )}
            <input {...inputProps} className="outline-none border-none px-2 py-1 flex-auto" ref={inputRef} />
        </div>
    );
};
