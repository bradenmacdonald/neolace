import { C, defineAction, VNID } from "vertex-framework";
import { Site } from "../Site";
import { EntryType } from "./EntryType";


// Schema changes are split into two types, "expand" and "contract".
// "Expand" changes are non-desctructive and backwards+forwards compatible.
// "Contract" changes are potentially destructive and not necessarily backwards/forward compatible.

/**
 * Add a new "EntryType" for a site.
 */
export const ExpandSchema_AddEntryType = defineAction({
    type: "ExpandSchema_AddEntryType",
    parameters: {} as {
        siteId: VNID;
        // The name of this entry type, e.g. "Note", "Article", "Technology", "Design"
        name: string;
        class: "regular";// class: regular (an article or just name+properties) vs. Image vs. DataTable
    },
    resultData: {} as {
        id: VNID;
    },
    apply: async (tx, data) => {
        const id = VNID();

        const result = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            CREATE (et:${EntryType} {
                id: ${id},
                name: ${data.name},
                class: ${data.class}
            })-[:${EntryType.rel.FOR_SITE}]->(site)
        `.RETURN({}));
        return {
            resultData: { id, },
            modifiedNodes: [id],
            description: `Added ${EntryType.withId(id)}`,
        };
    },
});
