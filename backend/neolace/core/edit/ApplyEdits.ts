import { EditChangeType, EditList, getEditType } from "neolace/deps/neolace-api.ts";
import { C, defineAction, isVNID, VNID } from "neolace/deps/vertex-framework.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";
import { EditHadNoEffect, editImplementations } from "./implementations.ts";
import { AppliedEdit } from "./AppliedEdit.ts";
import { EditSource, ImportSource, SystemSource } from "./EditSource.ts";

export const UseImportSource = Symbol("ImportSource");
export const UseSystemSource = Symbol("ImportSource");

/**
 * Apply a set of edits (to schema and/or content)
 */
export const ApplyEdits = defineAction({
    type: "ApplyEdits",
    parameters: {} as {
        siteId: VNID;
        /** The ID of the edit source that the edits are coming from; a draft ID, connection ID, or ImportSource or SystemSource. */
        editSource: VNID | typeof UseSystemSource | typeof UseImportSource;
        edits: EditList;
    },
    resultData: {} as {
        appliedEditIds: VNID[];
    },
    apply: async (tx, data) => {
        if (data.editSource === undefined) {
            throw new Error(`Missing editSource in call to applyEdits.`);
        }
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
            const result = await implementation(
                tx,
                edit.data,
                siteId,
                isVNID(data.editSource) ? data.editSource : undefined,
            );
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
            let editSourceId: VNID;
            if (data.editSource === UseSystemSource || data.editSource === UseImportSource) {
                // This is complicated code to run a MERGE to ensure that the special "SystemSource" or "ImportSource" exists for the current site.
                // We use a merge to avoid issues with competing transactions.
                const SourceClass = data.editSource === UseSystemSource ? SystemSource : ImportSource;
                const query = C`
                    MATCH (site:${Site} {id: ${siteId}})
                    MERGE (editSource:${SourceClass}:${C(EditSource.label)})-[:${EditSource.rel.FOR_SITE}]->(site)
                    ON CREATE
                        SET editSource.id = ${VNID()}
                    RETURN editSource.id`;
                const result = await tx.run(query.queryString, query.params);
                if (result.records.length !== 1) {
                    throw new Error("Failed to create SystemSource/ImportSource for that site.");
                }
                editSourceId = result.records[0].get("editSource.id");
                if (result.summary.counters.updates().nodesCreated > 0) {
                    modifiedNodes.add(editSourceId);
                }
            } else if (isVNID(data.editSource)) {
                editSourceId = data.editSource; // Probably a Draft or a Connection
            } else {
                throw new Error("Missing the editSource for the edits, which is required.");
            }
            await tx.query(C`
                MATCH (site:${Site} {id: ${siteId}})
                MATCH (editSource:${EditSource} {id: ${editSourceId}})
                WITH site, editSource
                UNWIND ${appliedEditsData} AS appliedEdit

                CREATE (ae:${AppliedEdit} {id: appliedEdit.id})
                CREATE (ae)-[:${AppliedEdit.rel.HAS_EDIT_SOURCE}]->(editSource)
                SET ae += appliedEdit.fields

                // Mark which entries were modified by this edit:
                WITH site, ae, appliedEdit
                MATCH (entry:${Entry} WHERE entry.id IN appliedEdit.modifiedNodes)-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                CREATE (ae)-[:${AppliedEdit.rel.MODIFIED}]->(entry)
            `);
            for (const ae of appliedEditsData) {
                modifiedNodes.add(ae.id);
            }
        }

        return {
            resultData: {
                appliedEditIds: appliedEditsData.map((appliedEdit) => appliedEdit.id),
            },
            modifiedNodes: Array.from(modifiedNodes),
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
