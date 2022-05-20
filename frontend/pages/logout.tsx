import React from 'react';
import { NextPage } from 'next'

import { SitePage } from 'components/SitePage';
import { UserContext } from 'components/user/UserContext';
import { Redirect } from 'components/utils/Redirect';

const LogoutPage: NextPage = function() {
    const user = React.useContext(UserContext);
    const [isLoggedOut, setLoggedOut] = React.useState(false);

    // Unconditionally log out. This runs only once.
    React.useEffect(() => {
        user.logout().then(() => setLoggedOut(true));
    // Because we always want this to run exactly once:
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <SitePage
            title="Log out"
            sitePreloaded={null}
        >
            <h1>Log out</h1>
            {
                isLoggedOut ?
                    <Redirect to="/" replace={true}>
                        <p>You have been logged out.</p>
                    </Redirect>
                :
                    <p>Logging out...</p>
            }
        </SitePage>
    );
}

export default LogoutPage;
