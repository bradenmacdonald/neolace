import { C, defineAction, VNID } from "vertex-framework";
import { Site } from "../Site";
import { ContentType, CreateEntryType, EditSet } from "neolace-api";
import { EntryType } from "../schema/EntryType";

/**
 * Apply a set of edits (to schema and/or content)
 */
export const ApplyEdits = defineAction({
    type: "ApplyEdits",
    parameters: {} as {
        siteId: VNID;
        edits: EditSet["edits"];
    },
    resultData: {},
    apply: async (tx, _data) => {

        const siteId = _data.siteId;
        const modifiedNodes: VNID[] = [];
        const descriptions: string[] = [];

        for (const {code, data} of _data.edits) {
            switch (code) {

                case CreateEntryType.code: {  // Create a new EntryType
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (et:${EntryType} {id: ${data.id}})-[:${EntryType.rel.FOR_SITE}]->(site)
                        SET et += ${{
                            name: data.name,
                            contentType: ContentType.None,
                        }}
                    `.RETURN({}));
                    descriptions.push(CreateEntryType.describe(data));
                    modifiedNodes.push(data.id);
                    break;
                }

                default:
                    throw new Error(`Unknown/unsupported edit type: ${code}`);
            }
        }

        return {
            resultData: {},
            modifiedNodes,
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
