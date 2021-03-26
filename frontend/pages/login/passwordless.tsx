import React, { ReactNode } from 'react';
import { NextPage } from 'next'

import { Page } from 'components/Page';
import { UserContext, UserStatus, } from 'components/user/UserContext';
import { Redirect } from 'components/utils/Redirect';

/** If running in a browser, get the #hash from the URL, excluding the "#" itself. */
function getHash() {
    if (typeof window !== "undefined") {
        if (window.location.hash) {
            return window.location.hash.substr(1);
        }
    }
    return "";
}

enum TokenStatus {
    Unknown,
    NoTokenPresent,
    ValidatingToken,
    TokenValid,
    TokenInvalid,
}

const PasswordlessLoginPage: NextPage = function() {
    const user = React.useContext(UserContext);
    const [tokenStatus, setTokenStatus] = React.useState(TokenStatus.Unknown);

    // Check the status of the token. This runs only once.
    React.useEffect(() => {
        const hash = getHash();
        if (hash) {
            setTokenStatus(TokenStatus.ValidatingToken);
            user.submitPasswordlessLoginToken(hash).then(() => {
                setTokenStatus(TokenStatus.TokenValid);
            }).catch(err => {
                setTokenStatus(TokenStatus.TokenInvalid);
            });
        } else {
            setTokenStatus(TokenStatus.NoTokenPresent);
        }
    }, []);

    let detail: ReactNode = <>Error: unknown status enum value</>;
    switch (tokenStatus) {
        case TokenStatus.Unknown: {
            detail = <>...</>
            break;
        }
        case TokenStatus.ValidatingToken: {
            detail = <>Logging you in...</>;
            break;
        }
        case TokenStatus.NoTokenPresent: {
            if (user.status === UserStatus.LoggedIn) {
                detail = <Redirect to="/" replace={true} />;
            } else {
                detail = <>Token missing. The link you clicked did not work for some reason.</>;
            }
            break;
        }
        case TokenStatus.TokenValid: {
            detail = <Redirect to="/" replace={true}>You are now logged in.</Redirect>;
            break;
        }
        case TokenStatus.TokenInvalid: {
            if (user.status === UserStatus.LoggedIn) {
                detail = <>That link is invalid or has expired, but you were already logged in anyways.</>;
            } else {
                detail = <>That link is invalid or has expired.</>;
            }
            break;
        }
    }

    return (
        <Page
            title="Log in to TechNotes"
        >
            <h1>Log in to TechNotes</h1>
            {detail}
        </Page>
    );
}

export default PasswordlessLoginPage;
