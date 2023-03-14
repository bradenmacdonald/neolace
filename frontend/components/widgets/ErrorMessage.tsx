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
