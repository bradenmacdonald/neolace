/** Are we currently running in a browser? (if not, we're prerendering on the server in Node.js) */
export const IN_BROWSER = (typeof window !== "undefined");
/** URL of the backend server */
export const API_SERVER_URL: string = IN_BROWSER ? process.env.NEXT_PUBLIC_API_SERVER_URL : process.env.NEXT_PUBLIC_API_SERVER_INTERNAL_URL;
/** URL of the authentication server */
export const AUTHN_SERVER_URL: string = process.env.NEXT_PUBLIC_AUTHN_URL;

import * as KeratinAuthN from 'keratin-authn';

// If we're running in the browser, initialize Keratin AuthN to check the user's authentication status:
if (IN_BROWSER) {
    KeratinAuthN.setHost(AUTHN_SERVER_URL);
    KeratinAuthN.setLocalStorageStore('tn-session');
}
