import React from 'react';
import { NextPage } from 'next'

import { Page } from 'components/Page';
import { UserContext } from 'components/user/UserContext';
import { Redirect } from 'components/utils/Redirect';

const LogoutPage: NextPage = function() {
    const user = React.useContext(UserContext);
    const [isLoggedOut, setLoggedOut] = React.useState(false);

    // Unconditionally log out. This runs only once.
    React.useEffect(() => {
        user.logout().then(() => setLoggedOut(true));
    }, []);

    return (
        <Page
            title="Log out of TechNotes"
        >
            <h1>Log out of TechNotes</h1>
            {
                isLoggedOut ?
                    <Redirect to="/" replace={true}>
                        <p>You have been logged out.</p>
                    </Redirect>
                :
                    <p>Logging out...</p>
            }
        </Page>
    );
}

export default LogoutPage;
