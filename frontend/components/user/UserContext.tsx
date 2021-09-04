/**
 * The UserContext is a React Context that allows components to be aware of the current user.
 *
 * During server-side rendering, the "current user" is always Unknown; since we want to serve
 * many pages statically we don't include user-awareness on the server-side. Once the page loads
 * on the client side, we call out to the TechNotes API and then set the user status to either
 * Anonymous or LoggedIn
 */
import React from 'react';
import * as KeratinAuthN from 'keratin-authn';
import { IN_BROWSER } from 'lib/config';
import { client, apiSessionPromise } from 'lib/api-client';

export enum UserStatus {
    Unknown,
    Anonymous,
    LoggedIn,
}

interface UserData {
    status: UserStatus;
    username: string;
    fullName: string;
}

export interface UserContextData extends UserData {
    submitPasswordlessLoginToken: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const UserContext = React.createContext<UserContextData>({
    // The following defaults are only used when the UserProvider is absent from the React tree, i.e. during tests.
    status: UserStatus.Unknown,
    username: "JordanUCM",
    fullName: "Jordan UserContextMissing",
    // Submit the token (that was emailed to the user), to finalize a passwordless login.
    submitPasswordlessLoginToken: async () => {},
    // Log the user out.
    logout: async () => {},
});

export const UserProvider: React.FunctionComponent = (props) => {
    const [data, setData] = React.useState<UserData>({
        // This is the data used when the page is loading, or when it's rendered on the server side.
        status: UserStatus.Unknown,
        username: "▅▅▅▅",
        fullName: "▅▅▅▅▅ ▅▅▅▅▅▅▅",
    });

    // If we're running in the browser, load the user status from the server
    const refresh = React.useCallback(async () => {
        if (!IN_BROWSER) {
            return;
        }
        // Check if the user is logged in. Elsewhere in the code we always ensure the token is valid
        // or deleted (via apiSessionPromise or await logout() etc.), before calling this refresh() method.
        const currentToken = KeratinAuthN.session();
        if (currentToken === undefined) {
            // The user is not logged in:
            setData({
                status: UserStatus.Anonymous,
                username: "",
                fullName: "",
            });
        } else {
            // The user is logged in.
            try {
                // Fetch the user profile. But we need to avoid a race condition if the session token changes while we're fetching (e.g. user logs out)
                const userData = await client.whoAmI();
                if (currentToken === KeratinAuthN.session()) { // <-- This avoids the race condition.
                    setData({
                        status: UserStatus.LoggedIn,
                        username: userData.username,
                        fullName: userData.fullName,
                    });
                }
            } catch (err) {
                console.error(`Unable to fetch user profile data: ${err}`);
                // This can happen if the JWT is expired or invalid, but in a way that still passes the minimal
                // validation done client-side by KeratinAuthN.refreshSession()
                setData({
                    status: UserStatus.Anonymous,
                    username: "",
                    fullName: "",
                });
            }
        }
    }, []);

    // Callback to log the user in, by submitting a token that was emailed to them.
    const submitPasswordlessLoginToken = React.useCallback(async (token: string) => {
        await KeratinAuthN.sessionTokenLogin({token, });
        refresh();
    }, []);

    // Callback to log the user out
    const logout = React.useCallback(async () => {
        await KeratinAuthN.logout();
        refresh();
    }, []);

    // Check the user's login status when this component is first mounted:
    React.useEffect(() => {
        // If there is an API token in the user's local session, validate or delete it, then refresh()
        apiSessionPromise.finally(() => {
            refresh();
        });
    }, []); // <-- [] indicates no dependencies (only run once).

    return (
        <UserContext.Provider value={{...data, submitPasswordlessLoginToken, logout}}>
            {props.children}
        </UserContext.Provider>
    );
}

/** Check if the given email address is avilable for registration. */
export async function isEmailAvailable(email: string): Promise<boolean> {
    return await KeratinAuthN.isAvailable(email);
}

/**
 * Request a passwordless login.
 * Returns true if the email was valid and a login link was emailed to the user.
 * Returns false if the email is not a registered user.
 * Rejects the promise if an error occurs with requesting the login.
 * @param email 
 */
export async function requestPasswordlessLogin(email: string): Promise<boolean> {
    const result = await client.requestPasswordlessLogin({email});
    return result.requested;
}
