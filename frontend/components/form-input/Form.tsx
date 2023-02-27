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
