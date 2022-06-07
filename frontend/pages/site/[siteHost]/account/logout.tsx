import React from "react";
import { NextPage } from "next";

import { SitePage } from "components/SitePage";
import { UserContext } from "components/user/UserContext";
import { Spinner } from "components/widgets/Spinner";

const LogoutPage: NextPage = function () {
    const user = React.useContext(UserContext);
    const [isLoggedOut, setLoggedOut] = React.useState(false);

    // Unconditionally log out. This runs only once.
    React.useEffect(() => {
        user.logout().then(() => setLoggedOut(true));
        // Because we always want this to run exactly once:
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SitePage title="Log out">
            <h1>Log out</h1>
            {isLoggedOut
                ? (
                    <p>You have been logged out.</p>
                )
                : <p>Logging out... <Spinner /></p>}
        </SitePage>
    );
};

export default LogoutPage;
