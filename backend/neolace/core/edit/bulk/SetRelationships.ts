/**
 * @file Implementation of bulk relationship edits
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, PropertyType, SetRelationships, VNID } from "neolace/deps/neolace-sdk.ts";
import { BulkAppliedEditData, defineBulkImplementation } from "neolace/core/edit/implementations.ts";
import { Connection, Entry, EntryType, Property, PropertyFact, Site } from "neolace/core/mod.ts";
import { isSameEntrySpec } from "./SetPropertyFacts.ts";

/**
 * Overite the relationship property values (property facts) for specific properties of a specific entry
 */
export const doSetRelationships = defineBulkImplementation(
    SetRelationships,
    async (tx, edits_, siteId, connectionId) => {
        // In order to make these bulk edits as efficient as possible, most of the work is done inside Neo4j.

        // client-side validation that's not captured by the schema:
        const edits = edits_.map((edit) => ({
            entryWith: edit.entryWith,
            set: edit.set.map((p) => ({
                propertyKey: p.propertyKey,
                toEntries: p.toEntries.map((f, idx) => ({
                    entryWith: f.entryWith,
                    note: f.note ?? "", // Set default because note cannot be null
                    slot: f.slot ?? "", // Set default because slot cannot be null
                    rank: idx + 1, // Set rank automatically (1,2,3,...)
                    id: VNID(), // Add in a VNID in case we have to create this new PropertyFact
                })),
            })),
        }));
        // Further validation and optimization before we do our actual query:
        for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            // Check if a single edit has multiple 'set' entries for the same property (not allowed)
            const propKeysSet = new Set<string>();
            for (const propSpec of edit.set) {
                if (propKeysSet.has(propSpec.propertyKey)) {
                    throw new InvalidEdit(
                        SetRelationships.code,
                        {
                            propertyKey: propSpec.propertyKey,
                            ...edit.entryWith,
                        },
                        `Unable to bulk set relationship property facts. The entry with ` +
                            `${Object.keys(edit.entryWith)[0]} "${Object.values(edit.entryWith)[0]}" had conflicting ` +
                            `values for the "${propSpec.propertyKey}" relationship property.`,
                    );
                }
                propKeysSet.add(propSpec.propertyKey);
            }

            // Check if any other edits affect the same entry
            for (let j = i + 1; j < edits.length; j++) {
                const laterEdit = edits[j];
                if (isSameEntrySpec(edit.entryWith, laterEdit.entryWith)) {
                    // Two separate edits are changing the same entry. For efficiency, combine these into a single edit.
                    // If there are separate changes to the same property of the same entry, we only need the later
                    // change as it will overwrite the earlier one, and trying to do them both in one transaction causes
                    // issues with how our query creates/deletes PropertyFacts.
                    for (const laterPropSpec of laterEdit.set) {
                        const indexInEdit = edit.set.findIndex((p) => p.propertyKey === laterPropSpec.propertyKey);
                        if (indexInEdit === -1) {
                            edit.set.push(laterPropSpec);
                        } else {
                            edit.set[indexInEdit] = laterPropSpec;
                        }
                    }
                    edits.splice(j, 1); // delete edits[j]
                    j--; // Hold the value of j constant since we just deleted the entry at this index.
                }
            }
        }

        // Every bulk update should execute in a single statement, using UNWIND:
        const result = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (connection:${Connection} {id: ${connectionId}})-[:${Connection.rel.FOR_SITE}]->(site)
            WITH site, connection, ${edits} AS edits
            UNWIND range(0, size(edits)) AS idx
            WITH site, connection, idx, edits[idx] AS edit

            // Match the entry, using either entryId or key.
            // We need to use a subquery and union in order to force use of our unique indexes.
            // Writing it as MATCH (entry:...) WHERE CASE ... THEN entry.key = ... ELSE entry.id = ... END
            // works but is horribly inefficient since it doesn't use the indexes.
            CALL {
                WITH edit, site
                MATCH (entry:${Entry} {siteNamespace: site.id, key: edit.entryWith.entryKey})
                    WHERE edit.entryWith.entryKey IS NOT NULL
                    RETURN entry
                UNION
                WITH edit, site
                MATCH (entry:${Entry} {id: edit.entryWith.entryId})
                    WHERE edit.entryWith.entryId IS NOT NULL
                    RETURN entry
            }
            
            // Make sure the entry is on the same site:
            MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)

            UNWIND edit.set AS setProp

            MATCH (property:${Property} {siteNamespace: site.id, key: setProp.propertyKey})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
                WHERE property.type IN ${[PropertyType.RelIsA, PropertyType.RelOther]}
            // Collect the data of all the existing facts set for this property on this entry, so we can see what changed later:
            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(oldFact:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
            WITH idx, site, setProp, entry, property, collect(oldFact {.id, .valueExpression, .note, .rank, .slot}) AS oldFacts

            // Create new property facts if matching facts don't already exist:
            CALL {
                WITH site, setProp, entry, property
                UNWIND setProp.toEntries AS toEntrySpec

                // Find the target entry of this relationship:
                CALL {
                    WITH toEntrySpec, site
                    MATCH (toEntry:${Entry} {siteNamespace: site.id, key: toEntrySpec.entryWith.entryKey})
                        WHERE toEntrySpec.entryWith.entryKey IS NOT NULL
                        RETURN toEntry
                    UNION
                    WITH toEntrySpec, site
                    MATCH (toEntry:${Entry} {id: toEntrySpec.entryWith.entryId})
                        WHERE toEntrySpec.entryWith.entryId IS NOT NULL
                        RETURN toEntry
                }

                MATCH (toEntry)-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)

                MERGE (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact} {
                    valueExpression: 'entry("' + toEntry.id + '")',
                    note: toEntrySpec.note,
                    rank: toInteger(toEntrySpec.rank),
                    slot: toEntrySpec.slot
                })-[:${PropertyFact.rel.FOR_PROP}]->(property)
                    ON CREATE SET
                        pf.id = toEntrySpec.id,
                        pf.added = true
                    ON MATCH SET
                        pf.keep = true

                FOREACH (x IN CASE WHEN pf.added AND property.type = ${PropertyType.RelIsA} THEN [1] ELSE [] END |
                    CREATE (entry)-[rel:${Entry.rel.IS_A}]->(toEntry)
                    SET pf.directRelNeo4jId = id(rel)
                )
                FOREACH (x IN CASE WHEN pf.added AND property.type = ${PropertyType.RelOther} THEN [1] ELSE [] END |
                    CREATE (entry)-[rel:${Entry.rel.RELATES_TO}]->(toEntry)
                    SET pf.directRelNeo4jId = id(rel)
                )
            }

            WITH idx, site, entry, property, oldFacts
            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
            WITH idx, site, entry.id AS entryId, property.key AS propKey, oldFacts, collect(pf) AS propFacts

            WITH idx, site, entryId, propKey, oldFacts, propFacts,
                [x in propFacts WHERE x.keep IS NULL AND x.added IS NULL | x.id] AS deleteFactIds,
                [x in propFacts WHERE x.added | x { .id, .valueExpression, .note, .rank, .slot }] AS addedFacts

            FOREACH (pf IN [x in propFacts WHERE x.keep] | REMOVE pf.keep)
            FOREACH (pf IN [x in propFacts WHERE x.added] | REMOVE pf.added)

            WITH idx, entryId, propKey, oldFacts, propFacts, deleteFactIds, addedFacts
            CALL {
                WITH propFacts, deleteFactIds
                UNWIND propFacts as pf
                WITH pf, deleteFactIds
                WHERE pf.id IN deleteFactIds
                MATCH (entry)-[rel:${Entry.rel.RELATES_TO}|${Entry.rel.IS_A}]->(toEntry)
                    WHERE id(rel) = pf.directRelNeo4jId
                DELETE rel
                DETACH DELETE pf
            }

            WITH idx, entryId, collect({uniqueKey: propKey, deletedFactIds: deleteFactIds, addedFacts: addedFacts, oldFacts: oldFacts}) AS data

            RETURN collect({idx: idx, entryId: entryId, data: data}) AS changes
        `.givesShape({
            changes: Field.List(
                Field.Record({
                    idx: Field.Int,
                    entryId: Field.VNID,
                    data: Field.List(Field.Record({
                        // propKey is in this record but we don't need it; it's just to stop collect() from combining
                        // records in the case where all the following arrays are empty.
                        deletedFactIds: Field.List(Field.VNID),
                        addedFacts: Field.List(Field.Record({
                            id: Field.VNID,
                            valueExpression: Field.String,
                            note: Field.String,
                            rank: Field.Int,
                            slot: Field.String,
                        })),
                        oldFacts: Field.NullOr.List(Field.Record({
                            id: Field.VNID,
                            valueExpression: Field.String,
                            note: Field.String,
                            slot: Field.String,
                            rank: Field.Int,
                        })),
                    })),
                }),
            ),
        }));

        if (result.changes.length !== edits.length) {
            throw new InvalidEdit(
                SetRelationships.code,
                {},
                "Unable to bulk set relationship property facts. Check if entryId, key, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a value property.",
            );
        }

        const appliedEdits: BulkAppliedEditData[] = [];

        // Now synthesize regular UpdatePropertyFact/DeletePropertyFact edits:
        for (const outcome of result.changes) {
            const edit = edits[outcome.idx];
            if (edit.set.length !== outcome.data.length) {
                throw new Error("expected edit.set to correspond to outcome.data");
            }
            for (const j in edit.set) {
                const { addedFacts, deletedFactIds, oldFacts } = outcome.data[j];
                for (const deletedId of deletedFactIds) {
                    const oldFact = oldFacts?.find((f) => f.id === deletedId);
                    if (oldFact === undefined) throw new Error("Missing old fact data");
                    appliedEdits.push({
                        code: "DeletePropertyFact",
                        data: {
                            entryId: outcome.entryId,
                            propertyFactId: deletedId,
                        },
                        modifiedNodes: [outcome.entryId, deletedId],
                        oldData: {
                            valueExpression: oldFact.valueExpression,
                            note: oldFact.note,
                            rank: oldFact.rank,
                            slot: oldFact.slot,
                        },
                    });
                }
                for (const addedFact of addedFacts) {
                    appliedEdits.push({
                        code: "AddPropertyFact",
                        data: {
                            entryId: outcome.entryId,
                            propertyKey: edit.set[j].propertyKey,
                            propertyFactId: addedFact.id,
                            valueExpression: addedFact.valueExpression,
                            note: addedFact.note,
                            rank: addedFact.rank,
                            slot: addedFact.slot,
                        },
                        modifiedNodes: [outcome.entryId, addedFact.id],
                        oldData: {
                            // There is no old data; this property fact is newly created as a whole
                        },
                    });
                }
            }
        }

        return { appliedEdits };
    },
);
