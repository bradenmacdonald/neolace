import { Schema, Type, string, nullable, } from "../api-schemas.ts";


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
});
export type SiteDetailsData = Type<typeof SiteDetailsSchema>;
