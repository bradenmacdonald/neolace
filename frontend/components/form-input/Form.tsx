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

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    children: React.ReactNode;
}

const doNothing = () => false;

export const Form: React.FunctionComponent<FormProps> = (props) => {
    const { children, className, ...formProps } = props;

    return (
        <form className={`block mt-2 ${className ?? ""}`} onSubmit={doNothing} {...formProps}>
            {children}
        </form>
    );
};

// Import helpers:
import { Control as _Control } from "./Control";
export const Control = _Control;
import { AutoControl as _AutoControl } from "./AutoControl";
export const AutoControl = _AutoControl;
