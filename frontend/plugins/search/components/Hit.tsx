/**
 * The data returned from TypeSense for each search result.
 */
export interface Hit extends Record<string, unknown> {
    id: string;
    name: string;
    type: string;
    objectId: string;
    key: string;
    description: string;
    articleText: string;
}
