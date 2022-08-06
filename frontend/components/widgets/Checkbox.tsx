import { TranslatableString } from "components/utils/i18n";
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
