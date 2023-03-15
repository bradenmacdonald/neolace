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
