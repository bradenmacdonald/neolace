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

import { Control as _Control } from "./Control";
/** @deprecated Use import { Control } from "components/form-input" */
export const Control = _Control;

import { AutoControl as _AutoControl } from "./AutoControl";
/** @deprecated Use import { AutoControl } from "components/form-input" */
export const AutoControl = _AutoControl;
