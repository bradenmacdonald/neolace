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
import { NextPage } from "next";

import { SitePage } from "components/SitePage";
import { Spinner } from "components/widgets/Spinner";
import { useUser } from "lib/sdk";

const LogoutPage: NextPage = function () {
    const user = useUser();
    const [isLoggedOut, setLoggedOut] = React.useState(false);

    // Unconditionally log out. This runs only once.
    React.useEffect(() => {
        user.authApi.logout().then(() => setLoggedOut(true));
        // Because we always want this to run exactly once:
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SitePage title="Log out">
            <h1>Log out</h1>
            {isLoggedOut ? <p>You have been logged out.</p> : (
                <p>
                    Logging out... <Spinner />
                </p>
            )}
        </SitePage>
    );
};

export default LogoutPage;
