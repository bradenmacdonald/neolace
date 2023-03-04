import { array, boolean, number, object, Record, Schema, string, Type } from "../api-schemas.ts";
import { ReferenceCacheSchema } from "../content/reference-cache.ts";
import { PermissionName } from "../permissions.ts";
import { VNID } from "../types.ts";

export enum SiteAccessMode {
    /** on a private site, access to entries is restricted to invited users */
    Private = "private",
    /** Public (contributions): anyone can read all entries and propose edits (default) */
    PublicContributions = "pubcont",
    /** Public (read only): anyone can read all entries but only those with permission can propose edits */
    PublicReadOnly = "readonly",
}

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
 * Parameters for the API call used to create or update a site.
 * Any fields which are left undefined will be unchanged if the site already exists.
 */
export const CreateOrUpdateSiteSchema = Schema({
    /** Should the site be created if it doesn't exist? */
    create: boolean.strictOptional(),
    /** If this is true and the site already exists, an error will be thrown and no changes will be made. */
    createOnly: boolean.strictOptional(),
    /** Name of this site (always public) */
    name: string.min(2).strictOptional(),
    /** Canonical domain name of this site, e.g. "plantdb.neolace.com" */
    domain: string.strictOptional(),
    /**
     * Description: a public description of the website, displayed to users in a few different places as well as to
     * search engines.
     */
    description: string.strictOptional(),
    /** Access mode: defines the base level of permissions for the site, e.g. if the content is public or private. */
    accessMode: Schema.enum(SiteAccessMode).strictOptional(),
    /** Markdown content for the site's home page. */
    homePageContent: string.strictOptional(),
    /** Markdown content for the site's footer, seen on every page. */
    footerContent: string.strictOptional(),
    /** Configuration for the frontend, like colors, plugins, etc. */
    frontendConfig: FrontendConfigSchema.strictOptional(),
    /** Permissions scheme for the site. This allows customizing the defaults that are set by 'accessMode' */
    publicGrantStrings: array.of(string).strictOptional(),
});

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
     * The key is a slug-like string identifier that uniquely identifies this site and must be used to specify the site
     * in any site-specific API requests.
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
