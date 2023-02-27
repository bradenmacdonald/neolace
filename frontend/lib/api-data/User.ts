import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";
import React from "react";
import useSWR from "swr";
import * as SDK from "neolace-sdk";

import { client } from "lib/api-client";
import { IN_BROWSER } from "lib/config";
import { getSessionToken } from "lib/authentication";

export enum UserStatus {
    Unknown,
    Anonymous,
    LoggedIn,
}

interface UserData {
    status: UserStatus;
    username: string;
    fullName: string;
    authApi: {
        logout: () => Promise<void>;
        submitPasswordlessLoginToken: (token: string) => Promise<void>;
        advanced: <T = void>(fn: (authApi: typeof KeratinAuthN) => Promise<T>) => Promise<T>;
    };
}

/**
 * React hook to get information about the currently logged in user, if any
 */
export function useUser(): UserData {
    const key = `userData`;
    const { data, error, mutate } = useSWR(key, async () => {
        if (!IN_BROWSER) {
            return undefined; // On the server we don't know if the user is logged in or not.
        }
        const token = await getSessionToken();
        if (!token) {
            return null; // The user is definitely not logged in
        }
        try {
            return await client.whoAmI();
        } catch (err) {
            if (err instanceof SDK.NotAuthenticated) {
                return null;
            }
            throw err;
        }
    }, {
        refreshInterval: 10 * 60_000,
    });

    const logout = React.useCallback((): Promise<void> => {
        return KeratinAuthN.logout().then(() => {
            mutate(null); // Invallidate the user data from our useSWR hook
        });
    }, [mutate]);

    const submitPasswordlessLoginToken = React.useCallback((token: string) => {
        return KeratinAuthN.sessionTokenLogin({ token }).then(() => {
            mutate(undefined); // Invallidate the user data from our useSWR hook
        });
    }, [mutate]);

    // Allow code to make any API calls to Keratin AuthN directly
    const advanced = React.useCallback(<T = void>(fn: (authApi: typeof KeratinAuthN) => Promise<T>) => {
        return new Promise<T>((resolve, reject) => {
            fn(KeratinAuthN).then((result: T) => {
                mutate(undefined); // Invallidate the user data from our useSWR hook
                resolve(result);
            }, (err) => reject(err));
        });
    }, [mutate]);

    const authApi = React.useMemo(() => ({
        logout,
        submitPasswordlessLoginToken,
        advanced,
    }), [logout, submitPasswordlessLoginToken, advanced]);

    if (data) {
        return {
            status: UserStatus.LoggedIn,
            username: data.username,
            fullName: data.fullName ?? "",
            authApi,
        };
    } else if (data === null || error) {
        // We're definitely not logged in
        return {
            status: UserStatus.Anonymous,
            username: "",
            fullName: "",
            authApi,
        };
    } else {
        // data is undefined - We're loading the data for the first time, or we're on the server...
        return {
            status: UserStatus.Unknown,
            username: "",
            fullName: "",
            authApi,
        };
    }
}
