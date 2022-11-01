import { EditChangeType, EditList, getEditType } from "neolace/deps/neolace-api.ts";
import { C, defineAction, VNID } from "neolace/deps/vertex-framework.ts";
import { Draft, Entry, EntryType, Site } from "neolace/core/mod.ts";
import { EditHadNoEffect, editImplementations } from "./implementations.ts";
import { AppliedEdit } from "./AppliedEdit.ts";

/**
 * Apply a set of edits (to schema and/or content)
 */
export const ApplyEdits = defineAction({
    type: "ApplyEdits",
    parameters: {} as {
        siteId: VNID;
        /** The ID of the draft whose edits we are applying. This is required if any of the edits need to access files uploaded to the draft. */
        draftId?: VNID;
        edits: EditList;
    },
    resultData: {},
    apply: async (tx, data) => {
        const siteId = data.siteId;
        const modifiedNodes = new Set<VNID>();
        const descriptions: string[] = [];

        const appliedEditsData: {
            id: VNID;
            fields: {
                code: string;
                /** changeType: is this a content edit or a schema edit? */
                changeType: EditChangeType;
                dataJSON: string;
                /** oldData: for edits that overwrite or delete data, this can hold information about the old value. */
                oldDataJSON: string;
                timestamp: Date;
            };
            modifiedNodes: VNID[];
        }[] = [];

        for (const edit of data.edits) {
            const editTypeDefinition = getEditType(edit.code);
            const implementation = editImplementations[edit.code];
            if (implementation === undefined) {
                throw new Error(`Cannot apply unknown/unsupported edit type: ${edit.code}`);
            }

            // Actually do the edit:
            const result = await implementation(tx, edit.data, siteId, data.draftId);
            if (result === EditHadNoEffect) {
                // This particular edit had no effect. We don't need to record it.
            } else {
                // Record the result of this edit:
                const description = editTypeDefinition.describe(edit.data);
                descriptions.push(description);
                for (const nodeId of result.modifiedNodes) {
                    modifiedNodes.add(nodeId);
                }
                appliedEditsData.push({
                    id: VNID(),
                    fields: {
                        code: edit.code,
                        changeType: editTypeDefinition.changeType,
                        dataJSON: JSON.stringify(edit.data),
                        oldDataJSON: JSON.stringify(result.oldValues ?? {}),
                        timestamp: new Date(),
                    },
                    modifiedNodes: result.modifiedNodes,
                });
            }
        }

        if (appliedEditsData.length > 0) {
            await tx.queryOne(C`
                MATCH (site:${Site} {id: ${siteId}})
                ${data.draftId ? C`MATCH (draft:${Draft} {id: ${data.draftId}})` : C``}
                // TODO: match connection if connection ID
                UNWIND ${appliedEditsData} AS appliedEdit

                CREATE (ae:${AppliedEdit} {id: appliedEdit.id})
                ${data.draftId ? C`CREATE (ae)-[:${AppliedEdit.rel.HAS_EDIT_SOURCE}]->(draft)` : C``}
                SET ae += appliedEdit.fields

                // Mark which entries were modified by this edit specifically:
                WITH ae, appliedEdit
                OPTIONAL MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                WHERE entry.id IN appliedEdit.modifiedNodes
                CREATE (ae)-[:${AppliedEdit.rel.MODIFIED}]->(entry)
            `.RETURN({}));
        }

        return {
            resultData: {},
            modifiedNodes: [...modifiedNodes, ...appliedEditsData.map((ae) => ae.id)],
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
