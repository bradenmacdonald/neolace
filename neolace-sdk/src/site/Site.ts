import { array, boolean, number, object, Record, Schema, string, Type } from "../api-schemas.ts";
import { ReferenceCacheSchema } from "../content/reference-cache.ts";
import { PermissionName } from "../permissions.ts";
import { VNID } from "../types.ts";

const rgbTuple = array.min(3).max(3).of(number).transform((x) => x as [number, number, number]);

export const FrontendConfigSchema = Schema({
    /** @deprecated */
    headerLinks: array.of(Schema({ text: string, href: string })).strictOptional(),
    /** @deprecated */
    integrations: Schema({
        plausibleAnalytics: Schema({ enabled: boolean }).strictOptional(),
    }).strictOptional(),
    redirects: Record(string, string).strictOptional(),
    features: Schema({
        hoverPreview: Schema({ enabled: boolean }).strictOptional(),
    }).strictOptional(),
    theme: Schema({
        headingColor: rgbTuple,
        linkColor: rgbTuple,
    }).strictOptional(),
    plugins: Record(string, object).strictOptional(),
});
export type FrontendConfigData = Type<typeof FrontendConfigSchema>;

/**
 * Data type that gives information about a Site
 */
export const SiteDetailsSchema = Schema({
    /** Name of this site (always public) */
    name: string,
    /** Canonical domain name of this site, e.g. "plantdb.neolace.com" */
    domain: string,
    /** Full URL of this site, without any trailing slash */
    url: string,
    /**
     * Description: a public description of the website, displayed to users in a few different places as well as to
     * search engines.
     */
    description: string,
    /**
     * The friendly ID is a slug-like string identifier that uniquely identifies this site and must be used to specify
     * the site in any site-specific API requests.
     */
    key: string,
    /**
     * The footer text (as Markdown) to display on every page of this site.
     */
    footerContent: string,

    /**
     * Configuration related to the frontend, such as:
     *   - theme/colors (future)
     *   - links shown in the header
     *   - analytics integrations to use
     *   - redirects
     */
    frontendConfig: FrontendConfigSchema,

    /** Is this site the "home site" for this Realm? */
    isHomeSite: boolean,
    /** Some functionality, like Login / Registration / My Account / Create new sites is available on the "home site" */
    homeSiteUrl: string,
    /** The name of the home site, which can also be used as the name of this site's realm. */
    homeSiteName: string,
});
export type SiteDetailsData = Type<typeof SiteDetailsSchema>;

/**
 * Data type that gives information about a Site's home page
 */
export const SiteHomePageSchema = Schema({
    /**
     * Markdown text for the home page. This defines the content of the home page.
     */
    homePageContent: string,
    /** Some details about any entries mentioned in the home page. */
    referenceCache: ReferenceCacheSchema,
});
export type SiteHomePageData = Type<typeof SiteHomePageSchema>;

/**
 * Site search schema (returned by one of the search plugin's endpoints)
 */
export const SiteSearchConnectionSchema = Schema({
    searchEndpoint: string,
    siteEntriesCollection: string,
    apiKey: string,
});
export type SiteSearchConnectionData = Type<typeof SiteSearchConnectionSchema>;

/** A summary of an entry, suitable to store in a search index */
export interface EntryIndexDocument {
    id: VNID;
    key: string;
    name: string;
    entryTypeKey: string;
    description: string;
    articleText: string;
    visibleToGroups: string[];
    allProps: string[];
    [k: `prop${string}`]: string[];
}

/** Data about what permissions the user has, in a given context */
export const SiteUserMyPermissionsSchema = Record(
    string,
    Schema({
        hasPerm: boolean,
    }),
);
export type SiteUserMyPermissionsData = Record<PermissionName, { hasPerm: boolean }>;
