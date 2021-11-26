import { Schema, Type, string, nullable, } from "../api-schemas.ts";
import { ReferenceCacheSchema } from "../content/Entry.ts";


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
