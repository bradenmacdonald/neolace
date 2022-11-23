import { C, Field } from "neolace/deps/vertex-framework.ts";
import { InvalidEdit, PropertyType, SetPropertyFacts, VNID } from "neolace/deps/neolace-api.ts";
import { BulkAppliedEditData, defineBulkImplementation } from "neolace/core/edit/implementations.ts";
import { Connection, Entry, EntryType, Property, PropertyFact, Site } from "neolace/core/mod.ts";

/**
 * Overite the property values (property facts) for specific properties of a specific entry
 */
export const doSetPropertyFacts = defineBulkImplementation(
    SetPropertyFacts,
    async (tx, edits_, siteId, connectionId) => {
        // In order to make these bulk edits as efficient as possible, most of the work is done inside Neo4j.

        // client-side validation that's not captured by the schema:
        const edits = edits_.map((edit) => ({
            entryWith: edit.entryWith,
            set: edit.set.map((p) => ({
                propertyKey: p.propertyKey,
                facts: p.facts.map((f, idx) => ({
                    valueExpression: f.valueExpression,
                    note: f.note ?? "", // Set default because note cannot be null
                    slot: f.slot ?? "", // Set default because slot cannot be null
                    rank: idx + 1, // Set rank automatically (1,2,3,...)
                    id: VNID(), // Add in a VNID in case we have to create this new PropertyFact
                })),
            })),
        }));

        // Every bulk update should execute in a single statement, using UNWIND:
        const result = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (connection:${Connection} {id: ${connectionId}})-[:${Connection.rel.FOR_SITE}]->(site)
            WITH site, connection, ${edits} AS edits
            UNWIND range(0, size(edits)) AS idx
            WITH site, connection, idx, edits[idx] AS edit

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

            // Make sure the entry is part of the correct site:
            MATCH (entry:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)

            UNWIND edit.set AS setProp

            MATCH (property:${Property} {siteNamespace: ${siteId}, key: setProp.propertyKey, type: ${PropertyType.Value}})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
            // Collect the data of all the existing facts set for this property on this entry, so we can see what changed later:
            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(oldFact:${PropertyFact})
                WHERE exists( (oldFact)-[:${PropertyFact.rel.FOR_PROP}]->(property) )
            WITH idx, site, setProp, entry, property, collect(oldFact {.id, .valueExpression, .note, .rank, .slot}) AS oldFacts

            // Create new property facts if matching facts don't already exist:
            CALL {
                WITH entry, setProp
                UNWIND setProp.facts AS fact
                MATCH (entry)-[:PROP_FACT]->(pf:${PropertyFact} {
                    valueExpression: fact.valueExpression,
                    note: fact.note,
                    rank: toInteger(fact.rank),
                    slot: fact.slot
                })
                SET pf.keep = true
                RETURN collect(fact.id) AS existingFacts
            }

            FOREACH (fact IN [x IN setProp.facts WHERE NOT x.id IN existingFacts] |
                CREATE (pf:${PropertyFact} {
                    id: fact.id,
                    keep: true,
                    valueExpression: fact.valueExpression,
                    note: fact.note,
                    rank: toInteger(fact.rank),
                    slot: fact.slot
                })
                CREATE (entry)-[:${Entry.rel.PROP_FACT}]->(pf)
                CREATE (pf)-[:${PropertyFact.rel.FOR_PROP}]->(property)
            )

            WITH idx, site, entry, property, oldFacts
            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})
                WHERE exists( (pf)-[:${PropertyFact.rel.FOR_PROP}]->(property) )
            WITH idx, site, entry.id AS entryId, property.id AS propertyKey, oldFacts, collect(pf) AS propFacts

            WITH idx, site, entryId, propertyKey, oldFacts, propFacts,
                [x in propFacts WHERE x.keep IS NULL | x.id] AS deleteFactIds

            FOREACH (pf IN propFacts | REMOVE pf.keep)
            FOREACH (pf IN [x in propFacts WHERE x.id IN deleteFactIds] | DETACH DELETE pf)

            WITH idx, entryId, collect({propertyKey: propertyKey, deletedFactIds: deleteFactIds, oldFacts: oldFacts}) AS data

            RETURN collect({idx: idx, entryId: entryId, data: data}) AS changes
        `.givesShape({
            changes: Field.List(
                Field.Record({
                    idx: Field.Int,
                    entryId: Field.VNID,
                    data: Field.List(Field.Record({
                        propertyKey: Field.String,
                        deletedFactIds: Field.List(Field.VNID),
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
                SetPropertyFacts.code,
                {},
                "Unable to bulk set property facts. Check if entryId, entryKey, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a relationship property.",
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
                const setProp = edit.set[j];
                const { deletedFactIds, oldFacts } = outcome.data[j];
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
                for (const fact of setProp.facts) {
                    const isUnchanged = oldFacts?.find((oldFact) => (
                        oldFact.valueExpression === fact.valueExpression &&
                        oldFact.note === fact.note &&
                        oldFact.slot === fact.slot &&
                        oldFact.rank === fact.rank
                    ));
                    if (isUnchanged) {
                        continue;
                    }
                    appliedEdits.push({
                        code: "AddPropertyFact",
                        data: {
                            entryId: outcome.entryId,
                            propertyKey: setProp.propertyKey,
                            propertyFactId: fact.id,
                            valueExpression: fact.valueExpression,
                            note: fact.note,
                            rank: fact.rank,
                            slot: fact.slot,
                        },
                        modifiedNodes: [outcome.entryId, fact.id],
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
