/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */

/**
 * VNIDs are not very human-readable, and must be unique across all sites on a Neolace realm, so for export purposes we
 * generally swap them out for human readable IDs wherever possible. We do still preserve the VNIDs in the export data
 * though, so that if importing back to the same site, we can avoid changing the VNIDs.
 */
export function replaceIdsInMarkdownAndLookupExpressions(
    idMap: Record<string, string>,
    markdownOrLookup: string,
    isExport = true,
) {
    // Literal expressions in lookups:
    if (isExport) { // On import, we want to preserve the keys in this case
        markdownOrLookup = markdownOrLookup.replaceAll(/(?<!\w)entry\("([0-9\p{Alphabetic}_\-]+)"\)/mgu, (_m, id) => {
            return `entry("${idMap[id] ?? id}")`;
        });
    }
    // Link in markdown:
    if (isExport) { // On import, we want to preserve the keys in this case
        markdownOrLookup = markdownOrLookup.replaceAll(/\]\(\/entry\/([0-9\p{Alphabetic}_\-]+)\)/mgu, (_m, id) => {
            return `](/entry/${idMap[id] ?? id})`;
        });
    }
    return markdownOrLookup;
}
