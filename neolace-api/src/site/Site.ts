import { Schema, Type, string, nullable, array, boolean, Record, number, } from "../api-schemas.ts";
import { ReferenceCacheSchema } from "../content/Entry.ts";

const rgbTuple = array.min(3).max(3).of(number).transform(x => x as [number, number, number]);

export const FrontendConfigSchema = Schema({
    headerLinks: array.of(Schema({text: string, href: string})).strictOptional(),
    integrations: Schema({
        plausibleAnalytics: Schema({enabled: boolean}).strictOptional(),
    }).strictOptional(),
    redirects: Record(string, string).strictOptional(),
    features: Schema({
        hoverPreview: Schema({enabled: boolean}).strictOptional(),
    }).strictOptional(),
    theme: Schema({
        headingColor: rgbTuple,
        linkColor: rgbTuple,
    }).strictOptional(),
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
    /**
     * Description: a public description of the website, displayed to users in a few different places as well as to
     * search engines.
     */
    description: nullable(string),
    /**
     * The short ID is a slug-like string identifier that uniquely identifies this site and must be used to specify the
     * site in any site-specific API requests.
     */
    shortId: string,
    /**
     * The footer text (as Markdown) to display on every page of this site.
     */
    footerMD: string,

    /**
     * Configuration related to the frontend, such as:
     *   - theme/colors (future)
     *   - links shown in the header
     *   - analytics integrations to use
     *   - redirects
     */
    frontendConfig: FrontendConfigSchema,
});
export type SiteDetailsData = Type<typeof SiteDetailsSchema>;

/**
 * Data type that gives information about a Site's home page
 */
 export const SiteHomePageSchema = Schema({
    /**
     * Markdown text for the home page. This defines the content of the home page.
     */
    homePageMD: string,
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
