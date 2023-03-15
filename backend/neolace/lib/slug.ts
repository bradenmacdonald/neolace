/**
 * @author MacDonald Thoughtstuff Inc.
 * @license public domain
 */

/** regex for validating that a string is a slug (allows uppercase) */
export const slugRegex = /^[-\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]+$/u;
/** regex to match any character that is not allowed as a slug (but allows uppercase) */
// deno-lint-ignore no-invalid-regexp
export const notSlugRegex = /[^-\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/ug;

/**
 * Slugify a string, e.g. "Drive Shaft" to "drive-shaft".
 * Allows "letters and numbers" (in any language) in the slug.
 * @param string The string to slugify
 */
export function makeSlug(string: string): string {
    string = string.toLowerCase().trim(); // convert to lowercase
    string = string.replace(notSlugRegex, " ");
    string = string.replace(/[-\s]+/g, "-"); // convert spaces to hyphens, eliminate consecutive spaces/hyphens
    string = string.replace(/-+$/g, ""); // trim any trailing hyphens
    return string;
}
