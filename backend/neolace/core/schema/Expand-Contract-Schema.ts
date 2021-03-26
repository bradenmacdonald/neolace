import { C, defineAction, UUID } from "vertex-framework";
import { Site } from "../Site";
import { EntryType } from "./EntryType";


// Schema changes are split into two types, "expand" and "contract".
// "Expand" changes are non-desctructive and backwards+forwards compatible.
// "Contract" changes are potentially destructive and not necessarily backwards/forward compatible.

/**
 * Add a new "EntryType" for a site.
 */
export const ExpandSchema_AddEntryType = defineAction<{
    siteUUID: UUID;
    // The name of this entry type, e.g. "Note", "Article", "Technology", "Design"
    name: string;
    class: "regular";// class: regular (an article or just name+properties) vs. Image vs. DataTable
}, {
    uuid: UUID;
}>({
    type: "ExpandSchema_AddEntryType",
    apply: async (tx, data) => {
        const uuid = UUID();

        const result = await tx.queryOne(C`
            MATCH (site:${Site} {uuid: ${data.siteUUID}})
            CREATE (et:${EntryType} {
                uuid: ${uuid},
                name: ${data.name},
                class: ${data.class}
            })-[:${EntryType.rel.FOR_SITE}]->(site)
        `.RETURN({}));
        return {
            resultData: { uuid, },
            modifiedNodes: [uuid],
        };
    },
    invert: (data, resultData) => null,
});
