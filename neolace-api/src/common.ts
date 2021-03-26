export interface VNodeData {
    /**
     * The ID of this object, e.g. "t-pv-module"
     *
     * Can be changed occasionally but old IDs will still point to the same object.
     * Use UUID if you need an indentified that's guaranteed never to change.
     */
    shortId: string;
    /** Unique permanent identified for this object (primary key) */
    uuid: string;
}
