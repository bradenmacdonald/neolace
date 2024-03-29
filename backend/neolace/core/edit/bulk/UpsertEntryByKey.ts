/**
 * @file Bulk edit operation to upsert entries based on their key (slug ID)
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field, Neo4jError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpsertEntryByKey, VNID } from "neolace/deps/neolace-sdk.ts";
import { BulkAppliedEditData, defineBulkImplementation } from "neolace/core/edit/implementations.ts";
import { Connection, Entry, EntryType, Site } from "neolace/core/mod.ts";

/**
 * Upsert (Create or Update) entries as needed, setting their name and description.
 */
export const doUpsertEntryByKey = defineBulkImplementation(
    UpsertEntryByKey,
    async (tx, edits_, siteId, connectionId) => {
        // In order to make these bulk edits as efficient as possible, most of the work is done inside Neo4j.

        // client-side validation that's not captured by the schema:
        const edits = edits_.map((edit) => ({
            where: edit.where,
            set: edit.set,
            setOnCreate: { ...edit.setOnCreate, entryId: VNID() }, // Add a computed VNID here since we can't compute them within Neo4j
        }));

        // Every bulk update should execute in a single statement, using UNWIND:
        const result = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (connection:${Connection} {id: ${connectionId}})-[:${Connection.rel.FOR_SITE}]->(site)
            WITH site, connection, ${edits} AS edits
            UNWIND range(0, size(edits)) AS idx
            WITH site, connection, idx, edits[idx] AS edit

            MATCH (entryType:${EntryType} {siteNamespace: site.id, key: edit.where.entryTypeKey})
            OPTIONAL MATCH (oldEntry:${Entry} {siteNamespace: site.id, key: edit.where.entryKey})
                WHERE exists( (oldEntry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType) )
            WITH idx, edit, entryType, site, oldEntry {.name, .description, .key} as oldValues

            MERGE (entry:${Entry} {siteNamespace: site.id, key: edit.where.entryKey})-[:${Entry.rel.IS_OF_TYPE}]->(entryType)
                ON CREATE SET
                    entry.id = edit.setOnCreate.entryId,
                    entry.name = coalesce(edit.set.name, edit.setOnCreate.name, ""),
                    entry.description = coalesce(edit.set.description, edit.setOnCreate.description, ""),
                    entry.changed = true
                ON MATCH SET
                    entry += CASE WHEN edit.set.name IS NOT NULL AND edit.set.name <> entry.name THEN
                        {name: edit.set.name, changed: true}
                    ELSE {} END,
                    entry += CASE WHEN edit.set.description IS NOT NULL AND edit.set.description <> entry.description THEN
                        {description: edit.set.description, changed: true}
                    ELSE {} END
            WITH idx, entry, oldValues, entry.changed AS changed
            REMOVE entry.changed
            RETURN collect({idx: idx, entryId: entry.id, changed: changed, oldValues: oldValues}) AS changes
        `.givesShape({
            changes: Field.List(
                Field.Record({
                    idx: Field.Int,
                    entryId: Field.VNID,
                    changed: Field.Boolean,
                    oldValues: Field.NullOr.Map(Field.String),
                }),
            ),
        })).catch((err) => {
            if (err instanceof Neo4jError && err.message.includes("already exists")) {
                throw new InvalidEdit(
                    UpsertEntryByKey.code,
                    {},
                    "ID Conflict in upsert. Is another site using that entryId?",
                );
            } else {
                throw err;
            }
        });

        if (result.changes.length !== edits.length) {
            throw new InvalidEdit(
                UpsertEntryByKey.code,
                {},
                "Unable to bulk upsert entries. Check if entryTypeKey or connectionId is invalid.",
            );
        }

        const appliedEdits: BulkAppliedEditData[] = [];

        for (const outcome of result.changes) {
            const edit = edits[outcome.idx];
            if (!outcome.changed) {
                continue;
            } else if (outcome.oldValues === null) {
                // When oldValues is NULL, that means the entry was created.
                appliedEdits.push({
                    code: "CreateEntry",
                    data: {
                        entryTypeKey: edit.where.entryTypeKey,
                        entryId: outcome.entryId,
                        key: edit.where.entryKey,
                        name: edit.set?.name ?? edit.setOnCreate?.name ?? "",
                        description: edit.set?.description ?? edit.setOnCreate?.description ?? "",
                    },
                    modifiedNodes: [outcome.entryId],
                    oldData: {},
                });
            } else {
                // The entry already existed and was modified.
                if (edit.set?.name && edit.set.name !== outcome.oldValues.name) {
                    appliedEdits.push({
                        code: "SetEntryName",
                        data: { entryId: outcome.entryId, name: edit.set.name },
                        oldData: { name: outcome.oldValues.name },
                        modifiedNodes: [outcome.entryId],
                    });
                }
                if (edit.set?.description && edit.set.description !== outcome.oldValues.description) {
                    appliedEdits.push({
                        code: "SetEntryDescription",
                        data: { entryId: outcome.entryId, description: edit.set.description },
                        oldData: { description: outcome.oldValues.description },
                        modifiedNodes: [outcome.entryId],
                    });
                }
            }
        }

        return { appliedEdits };
    },
);
