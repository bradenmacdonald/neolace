import React from "react";
import { Icon } from "./Icon";

interface Props {
    children: React.ReactNode;
}

/**
 * An error message.
 */
export const ErrorMessage: React.FunctionComponent<Props> = (props: Props) => {
    return (
        <div className="bg-red-50 border-red-800 border-2 px-2 py-1 rounded-md pl-8">
            <span className="text-red-800 -ml-6 pr-1">
                <Icon icon="exclamation-triangle-fill" />
            </span>{" "}
            {props.children}
        </div>
    );
};
