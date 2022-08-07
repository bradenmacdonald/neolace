import React from "react";
import { Icon } from "./Icon";

interface Props {
    children: React.ReactNode;
}

/**
 * A success message.
 */
export const SuccessMessage: React.FunctionComponent<Props> = (props: Props) => {
    return (
        <span className="block bg-green-50 border-green-800 border-2 px-2 py-1 rounded-md pl-8">
            <span className="text-green-800 -ml-6 pr-1">
                <Icon icon="check-circle-fill" />
            </span>{" "}
            {props.children}
        </span>
    );
};
