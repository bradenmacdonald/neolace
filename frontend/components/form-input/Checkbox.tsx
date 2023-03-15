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

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    checked: boolean;
    children: React.ReactNode;
}

export const Checkbox: React.FunctionComponent<Props> = (props) => {
    const { children, className: customClass, ...overrideInputProps } = props;

    const inputProps = { type: "checkbox", ...overrideInputProps };

    return (
        <label className={`block ${customClass}`}>
            <input {...inputProps} />{" "}
            {children}
        </label>
    );
};
