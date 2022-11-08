import useSWR from "swr";
import { useRouter } from "next/router";
import * as api from "neolace-api";

import { client } from "lib/api-client";
import { AsyncCache } from "lib/async-cache";

export type SiteData = api.SiteDetailsData;

/**
 * React hook to get basic data about the current site.
 * @returns
 */
export function useSiteData(options: { fallback?: SiteData } = {}): { site: SiteData; siteError: api.ApiError } {
    const router = useRouter();
    // router.query.siteHost gives the site's domain name because of how we have the Next.js URL rewriting configured.
    const domain = router.query.siteHost as string;
    // eslint-disable-next-line prefer-const
    let { data, error } = useSWR(`site:${domain}`, async () => {
        if (domain) {
            return await client.getSite({ domain });
        } else {
            throw new Error("Can't load site yet because domain is unknown.");
        }
    }, {
        refreshInterval: 10 * 60_000, // Reload the site data every 10 minutes in case anything was changed.
    });
    if (data === undefined) {
        // If data is undefined at this point, it means that it hasn't yet been loaded from the API (or couldn't be),
        // AND that the data is not available from a parent <SiteDataProvider> (which usually should be the source of
        // preloaded site data for most pages in Neolace.)
        // Fallback to a default while we wait for the data to load:
        // Note that we cannot use this as a 'fallbackData' parameter in the useSWR call above, because then it would
        // overwrite the data coming from <SiteDataProvider>, which makes the preloaded site data available as a
        // global fallback.
        data = options.fallback ?? {
            name: "━━━━━━━━━━━━━━",
            description: "",
            domain,
            url: "",
            footerContent: "━━━━━━━━━━━━━━",
            shortId: "",
            frontendConfig: {},
            isHomeSite: false,
            homeSiteName: "━━━━━━━━━━━━━━",
            homeSiteUrl: "",
        };
    }
    return { site: data, siteError: error };
}

const siteDataCache = new AsyncCache<string, SiteData>(
    async (domain) => {
        return await client.getSite({ domain });
    },
    5 * 60_000, // timeout is 5 minutes
);

/** Server-side method to get data about a site by domain. On the client side, use the useSiteData() hook. */
export async function getSiteData(domain: string): Promise<SiteData | null> {
    try {
        // If the site has been previously retrieved, this cache will always return the cached value immediately.
        // (Occasionally it will be refreshed in the background, but we still get an immediate result here.)
        return await siteDataCache.get(domain);
    } catch (err) {
        if (err instanceof api.NotFound) {
            return null;
        }
        throw err;
    }
}
