import type { ImageLoader } from 'next/image';
/** Are we currently running in development mode or production? */
export const DEVELOPMENT_MODE = process.env.NODE_ENV === "development";
/** Are we currently running in a browser? (if not, we're prerendering on the server in Node.js) */
export const IN_BROWSER = (typeof window !== "undefined");
/** URL of the backend server */
export const API_SERVER_URL: string = (IN_BROWSER ? process.env.NEXT_PUBLIC_API_SERVER_URL : process.env.NEXT_PUBLIC_API_SERVER_INTERNAL_URL) ?? "ERROR_API_SERVER_URL_UNDEFINED";
/** URL of the authentication server */
export const AUTHN_SERVER_URL: string = process.env.NEXT_PUBLIC_AUTHN_URL ?? "ERROR_NEXT_PUBLIC_AUTHN_URL_UNDEFINED";
/** Domain on which to set the authn cookie so it'll work across subdomains */
export const AUTHN_COOKIE_DOMAIN: string = process.env.NEXT_PUBLIC_AUTHN_COOKIE_DOMAIN ?? "error-no-cookie-domain-set";

import * as KeratinAuthN from "lib/keratin-authn/keratin-authn.min";

// If we're running in the browser, initialize Keratin AuthN to check the user's authentication status:
if (IN_BROWSER) {
    KeratinAuthN.setHost(AUTHN_SERVER_URL);
    
    //KeratinAuthN.setLocalStorageStore('tn-session');
    KeratinAuthN.setCookieStore("neolace-authn-keratin", {
        path: "/",
        domain: AUTHN_COOKIE_DOMAIN,
        sameSite: `Strict`,
    })
}

if (typeof API_SERVER_URL !== "string") {
    throw new Error("Environment variables are not set properly.");
}

/** Log something to the console, but only in a development environment. */
export const debugLog = DEVELOPMENT_MODE ? console.debug : () => {};

// Are we using imgproxy and a CDN to cache image thumbnails? Or using Next.js's built-in image resizing.
const imgProxyEnabled = process.env.NEXT_PUBLIC_IMGPROXY_ENABLED;

/**
 * A Next.js image loader that works with imgproxy and any CDN to serve thumbnails in production
 * 
 * Requires that imgproxy is running and the backend is configured to work with it.
 */
export const imgThumbnailLoader: ImageLoader = ({ src, width, quality }) => {
    if (imgProxyEnabled) {
        return src + `?width=${width}`
    }
    // Use the default Next.js built-in image resizer:
    const params = new URLSearchParams();
    params.set('url', src);
    params.set('w', width.toString());
    params.set('q', quality?.toString() ?? "85");
    return `/_next/image?${params.toString()}`;
}
