
/**
 * Given the shortId of any TechNotes entity, get the relative URL to that entity's page.
 */
export function urlForShortId(shortId: string): string|undefined {
    const prefix = shortId.substr(0, shortId.indexOf("-"));  // Note this works even if '-' is not found.

    switch (prefix) {
        case "t": return "/tech/" + shortId;
        case "p": return "/process/" + shortId;
        case "d": return "/design/" + shortId;
        case "img": return "/library/image/" + shortId;
        default:
            return undefined;
    }
}
