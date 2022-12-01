/**
 * The data returned from TypeSense for each search result.
 */
export interface Hit extends Record<string, unknown> {
    id: string;
    name: string;
    entryTypeKey: string;
    objectId: string;
    key: string;
    description: string;
    articleText: string;
}
