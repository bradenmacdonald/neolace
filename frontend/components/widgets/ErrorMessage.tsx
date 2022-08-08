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
        // This needs to be a <span> not a <div> because sometimes it's rendered inside a <p> element, e.g. if an
        // inline lookup function gives an error.
        <span className="block bg-red-50 border-red-800 border-2 px-2 py-1 rounded-md pl-8">
            <span className="text-red-800 -ml-6 pr-1">
                <Icon icon="exclamation-triangle-fill" />
            </span>{" "}
            {props.children}
        </span>
    );
};
