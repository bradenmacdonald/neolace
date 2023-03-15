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
import Router from "next/router";

/**
 * Displaying this component anywhere will redirect the user to the specified page.
 */
export const Redirect: React.FunctionComponent<{to: string, replace?: boolean, children?: React.ReactNode}> = function(props) {
    // When this components first renders, tell the Router to redirect.
    React.useEffect(() => {
        if (props.replace) {
            Router.replace(props.to);
        } else {
            Router.push(props.to);
        }
    }, [props.to, props.replace]);
    return <>{props.children}</>;
}
