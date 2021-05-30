import { C, defineAction, VNID } from "vertex-framework";
import { Site } from "../Site";
import { ContentType, CreateEntryType, EditSet, UpdateEntryType } from "neolace-api";
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
    apply: async (tx, data) => {

        const siteId = data.siteId;
        const modifiedNodes: VNID[] = [];
        const descriptions: string[] = [];

        for (const edit of data.edits) {
            switch (edit.code) {

                case CreateEntryType.code: {  // Create a new EntryType
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site)
                        SET et += ${{
                            name: edit.data.name,
                            contentType: ContentType.None,
                        }}
                    `.RETURN({}));
                    descriptions.push(CreateEntryType.describe(edit.data));
                    modifiedNodes.push(edit.data.id);
                    break;
                }
                case UpdateEntryType.code: {  // Update an EntryType

                    const changes: any = {}
                    // Be sure we only set allowed properties onto the EditType VNode:
                    if (edit.data.name !== undefined) changes.name = edit.data.name;
                    if (edit.data.description !== undefined) changes.description = edit.data.description;
                    if (edit.data.contentType !== undefined) changes.contentType = edit.data.contentType;
                    if (edit.data.friendlyIdPrefix !== undefined) changes.friendlyIdPrefix = edit.data.friendlyIdPrefix;

                    await tx.queryOne(C`
                        MATCH (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET et += ${changes}
                    `.RETURN({}));
                    descriptions.push(UpdateEntryType.describe(edit.data));
                    modifiedNodes.push(edit.data.id);
                    break;
                }

                default:
                    throw new Error(`Unknown/unsupported edit type: ${(edit as any).code}`);
            }
        }

        return {
            resultData: {},
            modifiedNodes,
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
