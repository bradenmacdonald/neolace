/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license MIT
 */

const contentTypes: Record<string, string> = {
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/png": "png",
    "application/pdf": "pdf",
    "text/plain": "txt",
};

export const extensionFromContentType = (contentType: string) => {
    if (contentType in contentTypes) {
        return contentTypes[contentType];
    }
    throw new Error(`Unknown content type "${contentType}"`);
};

export const contentTypeFromExtension = (ext: string) => {
    for (const [ct, e] of Object.entries(contentTypes)) {
        if (e === ext) return ct;
    }
    throw new Error(`Unknown file extension "${ext}"`);
};
