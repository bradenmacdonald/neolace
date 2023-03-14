/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */

/** regex to match any character that is not allowed as a slug (but allows uppercase) */
// deno-lint-ignore no-invalid-regexp
const notSlugRegex = /[^-\p{Alphabetic}\p{Mark}\p{Decimal_Number}\p{Join_Control}]/ug;

/**
 * Slugify a string, e.g. "Drive Shaft" to "drive-shaft".
 * Allows "letters and numbers" (in any language) in the slug.
 * @param string The string to slugify
 */
export function slugify(string: string): string {
    string = string.toLowerCase().trim(); // convert to lowercase
    string = string.replace(notSlugRegex, " ");
    string = string.replace(/[-\s]+/g, "-"); // convert spaces to hyphens, eliminate consecutive spaces/hyphens
    string = string.replace(/-+$/g, ""); // trim any trailing hyphens
    return string;
}
