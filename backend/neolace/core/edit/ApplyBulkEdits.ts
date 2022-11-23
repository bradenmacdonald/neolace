import {
    AnyBulkEdit,
    BulkEditType,
    Edit,
    EditChangeType,
    SetPropertyFacts,
    SetRelationships,
    UpsertEntryById,
    UpsertEntryByKey,
} from "neolace/deps/neolace-api.ts";
import { C, defineAction, VNID } from "neolace/deps/vertex-framework.ts";
import { Connection, Entry, EntryType, Site } from "neolace/core/mod.ts";
import { BulkAppliedEditData } from "./implementations.ts";
import { AppliedEdit } from "./AppliedEdit.ts";

import { doUpsertEntryById } from "./bulk/UpsertEntryById.ts";
import { doUpsertEntryByKey } from "./bulk/UpsertEntryByKey.ts";
import { doSetPropertyFacts } from "./bulk/SetPropertyFacts.ts";
import { doSetRelationships } from "./bulk/SetRelationships.ts";

/** Helper method to filter an array of bulk edits to only the edits of a particular type, with correct typing. */
const filterEdits = <EditType extends BulkEditType>(edits: AnyBulkEdit[], editType: EditType) =>
    edits.filter((e) => e.code === editType.code) as Edit<EditType>[];

/**
 * Apply a set of bulk edits (to content)
 */
export const ApplyBulkEdits = defineAction({
    type: "ApplyBulkEdits",
    parameters: {} as {
        siteId: VNID;
        connectionId: VNID;
        edits: AnyBulkEdit[];
    },
    resultData: {} as {
        appliedEditIds: VNID[];
    },
    apply: async (tx, data) => {
        const appliedEdits: BulkAppliedEditData[] = [];

        // We apply edits in this order:

        // Upserts:
        const upsertsById = filterEdits(data.edits, UpsertEntryById);
        if (upsertsById.length > 0) {
            const editsData = upsertsById.map((e) => e.data);
            const outcome = await doUpsertEntryById(tx, editsData, data.siteId, data.connectionId);
            appliedEdits.push(...outcome.appliedEdits);
        }
        const upsertsByKey = filterEdits(data.edits, UpsertEntryByKey);
        if (upsertsByKey.length > 0) {
            const editsData = upsertsByKey.map((e) => e.data);
            const outcome = await doUpsertEntryByKey(tx, editsData, data.siteId, data.connectionId);
            appliedEdits.push(...outcome.appliedEdits);
        }

        // Properties:
        const setPropertyFacts = filterEdits(data.edits, SetPropertyFacts);
        if (setPropertyFacts.length > 0) {
            const editsData = setPropertyFacts.map((e) => e.data);
            const outcome = await doSetPropertyFacts(tx, editsData, data.siteId, data.connectionId);
            appliedEdits.push(...outcome.appliedEdits);
        }
        // Relationship properties:
        const setRelationships = filterEdits(data.edits, SetRelationships);
        if (setRelationships.length > 0) {
            const editsData = setRelationships.map((e) => e.data);
            const outcome = await doSetRelationships(tx, editsData, data.siteId, data.connectionId);
            appliedEdits.push(...outcome.appliedEdits);
        }

        // Now, we synthesize AppliedEdit entries as though the bulk edits were done using the normal content edits like
        // like CreateEntry, SetEntryDescription, etc.:
        const modifiedNodes = new Set<VNID>();
        // Convert the applied edits data to the format that's ready to insert into Neo4j
        const appliedEditsData = appliedEdits.map((ae) => ({
            id: VNID(),
            fieldValues: {
                code: ae.code,
                data: JSON.stringify(ae.data),
                oldData: JSON.stringify(ae.oldData),
            },
            modifiedNodes: ae.modifiedNodes,
        }));
        if (appliedEditsData.length > 0) {
            await tx.query(C`
                MATCH (site:${Site} {id: ${data.siteId}})
                MATCH (connection:${Connection} {id: ${data.connectionId}})-[:${Connection.rel.FOR_SITE}]->(site)
                UNWIND ${appliedEditsData} AS appliedEdit

                CREATE (ae:${AppliedEdit} {id: appliedEdit.id})
                CREATE (ae)-[:${AppliedEdit.rel.HAS_EDIT_SOURCE}]->(connection)
                SET ae += appliedEdit.fieldValues
                SET ae.changeType = ${EditChangeType.Content}
                SET ae.timestamp = datetime.realtime()

                // Mark which entries were modified by this edit:
                WITH site, ae, appliedEdit
                MATCH (entry:${Entry} WHERE entry.id IN appliedEdit.modifiedNodes)
                    WHERE exists((entry)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site))
                CREATE (ae)-[:${AppliedEdit.rel.MODIFIED}]->(entry)
            `);
            for (const ae of appliedEditsData) {
                modifiedNodes.add(ae.id);
                for (const vnid of ae.modifiedNodes) {
                    modifiedNodes.add(vnid);
                }
            }
        }

        return {
            resultData: {
                appliedEditIds: appliedEditsData.map((appliedEdit) => appliedEdit.id),
            },
            modifiedNodes: Array.from(modifiedNodes),
            description: `Bulk updated entries - made ${appliedEdits.length} changes for ${data.edits.length} edits.`,
        };
    },
});
