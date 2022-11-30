import { C, Field, Neo4jError } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, UpsertEntryById } from "neolace/deps/neolace-api.ts";
import { BulkAppliedEditData, defineBulkImplementation } from "neolace/core/edit/implementations.ts";
import { Connection, Entry, EntryType, Site } from "neolace/core/mod.ts";

/**
 * Upsert (Create or Update) entries as needed, setting their name and description.
 */
export const doUpsertEntryById = defineBulkImplementation(UpsertEntryById, async (tx, edits_, siteId, connectionId) => {
    // In order to make these bulk edits as efficient as possible, most of the work is done inside Neo4j.

    const edits: typeof edits_ = [...edits_];

    // client-side validation that's not captured by the schema:
    for (const editIndex in edits) {
        const edit = { ...edits[editIndex] };
        if (edit.set === undefined) edit.set = {};
        if (edit.setOnCreate === undefined) edit.setOnCreate = {};
        if (edit.setOnCreate.key === undefined && edit.set.key === undefined) {
            throw new InvalidEdit(
                UpsertEntryById.code,
                {},
                "UpsertEntryById requires a key in either set or setOnCreate.",
            );
        }
    }

    // Every bulk update should execute in a single statement, using UNWIND:
    const result = await tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        MATCH (connection:${Connection} {id: ${connectionId}})-[:${Connection.rel.FOR_SITE}]->(site)
        WITH site, connection, ${edits} AS edits
        UNWIND range(0, size(edits)) AS idx
        WITH site, connection, idx, edits[idx] AS edit

        MATCH (entryType:${EntryType} {siteNamespace: site.id, key: edit.where.entryTypeKey})
        OPTIONAL MATCH (oldEntry:${Entry} {id: edit.where.entryId})-[:${Entry.rel.IS_OF_TYPE}]->(entryType)
        WITH idx, edit, entryType, site, oldEntry {.name, .description, .key} as oldValues

        MERGE (entry:${Entry} {id: edit.where.entryId})-[:${Entry.rel.IS_OF_TYPE}]->(entryType)
            ON CREATE SET
                entry.name = coalesce(edit.set.name, edit.setOnCreate.name, ""),
                entry.description = coalesce(edit.set.description, edit.setOnCreate.description, ""),
                entry.siteNamespace = site.id,
                entry.key = coalesce(edit.set.key, edit.setOnCreate.key, ""),
                entry.changed = true
            ON MATCH SET
                entry += CASE WHEN edit.set.name IS NOT NULL AND edit.set.name <> entry.name THEN
                    {name: edit.set.name, changed: true}
                ELSE {} END,
                entry += CASE WHEN edit.set.description IS NOT NULL AND edit.set.description <> entry.description THEN
                    {description: edit.set.description, changed: true}
                ELSE {} END,
                entry += CASE WHEN edit.set.key IS NOT NULL AND edit.set.key <> entry.key THEN
                    {key: edit.set.key, changed: true}
                ELSE {} END
        WITH idx, entry, oldValues, entry.changed AS changed
        REMOVE entry.changed
        RETURN collect({idx: idx, entryId: entry.id, changed: changed, oldValues: oldValues}) AS changes
    `.givesShape({
        changes: Field.List(
            Field.Record({
                idx: Field.Int,
                id: Field.VNID,
                changed: Field.Boolean,
                oldValues: Field.NullOr.Map(Field.String),
            }),
        ),
    })).catch((err) => {
        if (err instanceof Neo4jError && err.message.includes("already exists")) {
            throw new InvalidEdit(
                UpsertEntryById.code,
                {},
                "ID Conflict in upsert. Is another site using that entryId?",
            );
        } else {
            throw err;
        }
    });

    if (result.changes.length !== edits.length) {
        throw new InvalidEdit(
            UpsertEntryById.code,
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
                    entryId: edit.where.entryId,
                    key: edit.set?.key ?? edit.setOnCreate?.key ?? "",
                    name: edit.set?.name ?? edit.setOnCreate?.name ?? "",
                    description: edit.set?.description ?? edit.setOnCreate?.description ?? "",
                },
                modifiedNodes: [edit.where.entryId],
                oldData: {},
            });
        } else {
            // The entry already existed and was modified.
            if (edit.set?.name && edit.set.name !== outcome.oldValues.name) {
                appliedEdits.push({
                    code: "SetEntryName",
                    data: { entryId: edit.where.entryId, name: edit.set.name },
                    oldData: { name: outcome.oldValues.name },
                    modifiedNodes: [edit.where.entryId],
                });
            }
            if (edit.set?.description && edit.set.description !== outcome.oldValues.description) {
                appliedEdits.push({
                    code: "SetEntryDescription",
                    data: { entryId: edit.where.entryId, description: edit.set.description },
                    oldData: { description: outcome.oldValues.description },
                    modifiedNodes: [edit.where.entryId],
                });
            }
            if (edit.set?.key && edit.set.key !== outcome.oldValues.key) {
                appliedEdits.push({
                    code: "SetEntryKey",
                    data: { entryId: edit.where.entryId, key: edit.set.key },
                    oldData: { key: outcome.oldValues.key },
                    modifiedNodes: [edit.where.entryId],
                });
            }
        }
    }

    return { appliedEdits };
});
