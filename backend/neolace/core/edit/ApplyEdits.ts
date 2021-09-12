// deno-lint-ignore-file no-explicit-any
import * as log from "std/log/mod.ts";
import {
    EditList,
    ContentType,
    CreateEntry,
    CreateEntryType,
    CreateRelationshipFact,
    CreateRelationshipType,
    UpdateEntryType,
    UpdateRelationshipType,
    getEditType,
    RelationshipCategory,
} from "neolace/deps/neolace-api.ts";
import { C, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "../Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { ComputedFact } from "../entry/ComputedFact.ts";

/**
 * Apply a set of edits (to schema and/or content)
 */
export const ApplyEdits = defineAction({
    type: "ApplyEdits",
    parameters: {} as {
        siteId: VNID;
        edits: EditList;
    },
    resultData: {},
    apply: async (tx, data) => {

        const siteId = data.siteId;
        const modifiedNodes = new Set<VNID>();
        const descriptions: string[] = [];

        for (const edit of data.edits) {

            const editTypeDefinition = getEditType(edit.code);
            const description = editTypeDefinition.describe(edit.data);
            descriptions.push(description);

            log.info(`Applying Draft (${edit.code}): ${description}`);

            switch (edit.code) {

                case CreateEntry.code: {  // Create a new Entry of a specific EntryType
                    await tx.queryOne(C`
                        MATCH (et:${EntryType} {id: ${edit.data.type}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        CREATE (e:${Entry} {id: ${edit.data.id}})
                        CREATE (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)
                        SET e.slugId = site.siteCode + ${edit.data.friendlyId}
                        SET e += ${{
                            name: edit.data.name,
                            description: edit.data.description,
                        }}
                    `.RETURN({}));
                    modifiedNodes.add(edit.data.id);
                    break;
                }

                case CreateRelationshipFact.code: {  // Create a new Relationship Fact (record a relationship between two Entries)

                    // We are about to put the relationship type into the query unescaped. Let's be very sure we validate it first:
                    const relType = await tx.queryOne(C`
                        MATCH (rt:${RelationshipType} {id: ${edit.data.type}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                    `.RETURN({"rt.category": Field.String}));
                    const category = relType["rt.category"] as RelationshipCategory;
                    if (!Object.values(RelationshipCategory).includes(category)) {
                        throw new Error("Internal error - unexpected value for relationship category");
                    }

                    // Create the new relationship fact.
                    // This query is written in such a way that it will also validate:
                    // 1. That the RelationshipType for this new relationship is part of the current Site.
                    // 2. That the "from entry" is of an EntryType allowed as a "from" EntryType for this RelationshipType
                    // 3. That the "to entry" is of an EntryType allowed as a "to" EntryType for this RelationshipType
                    // 4. 2 and 3 together with the validation code on RelationshipType also ensures that all referenced
                    //    entries are part of the same Site.
                    await tx.queryOne(C`
                        MATCH (relType:${RelationshipType} {id: ${edit.data.type}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        MATCH (fromEntry:${Entry} {id: ${edit.data.fromEntry}})-[:${Entry.rel.IS_OF_TYPE}]->(fromET:${EntryType}),
                              (relType)-[:${RelationshipType.rel.FROM_ENTRY_TYPE}]->(fromET)
                        MATCH (toEntry:${Entry} {id: ${edit.data.toEntry}})-[:${Entry.rel.IS_OF_TYPE}]->(toET:${EntryType}),
                              (relType)-[:${RelationshipType.rel.TO_ENTRY_TYPE}]->(toET)
                        CREATE (rf:${RelationshipFact} {id: ${edit.data.id}})
                        CREATE (rf)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType)
                        CREATE (rf)-[:${RelationshipFact.rel.HAS_FACT_SOURCE}]->(fromEntry)
                        CREATE (rf)-[:${RelationshipFact.rel.REL_FACT}]->(toEntry)
                        CREATE (fromEntry)-[:${Entry.rel.REL_FACT}]->(rf)

                        ${category === RelationshipCategory.IS_A ?
                            // If this is an IS_A relationship, also create a direct Entry-[IS_A]->Entry relationship,
                            // which makes computing ancestors much easier. We don't do this in general because there's
                            // no "proper" way to link a relationship between two entries to a RelationshipType without
                            // using an intermediate node like RelationshipFact, which is what we use.
                            C`CREATE (fromEntry)-[:${Entry.rel.IS_A} {relFactId: rf.id}]->(toEntry)`
                        : C('')}
                    `.RETURN({}));

                    modifiedNodes.add(edit.data.id);
                    modifiedNodes.add(edit.data.fromEntry);
                    break;
                }

                case CreateEntryType.code: {  // Create a new EntryType
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site)
                        SET et += ${{
                            name: edit.data.name,
                            contentType: edit.data.contentType,
                        }}
                    `.RETURN({}));
                    modifiedNodes.add(edit.data.id);
                    break;
                }
                case UpdateEntryType.code: {  // Update an EntryType

                    const changes: any = {}
                    // Be sure we only set allowed properties onto the EditType VNode:
                    if (edit.data.name !== undefined) changes.name = edit.data.name;
                    if (edit.data.description !== undefined) changes.description = edit.data.description;
                    if (edit.data.friendlyIdPrefix !== undefined) changes.friendlyIdPrefix = edit.data.friendlyIdPrefix;

                    // The following query will also validate that the entry type exists and is linked to the site.
                    await tx.queryOne(C`
                        MATCH (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET et += ${changes}
                    `.RETURN({}));
                    // From here on we don't need to validate the Site is correct.
                    if (edit.data.addOrUpdateComputedFacts?.length) {
                        await tx.query(C`
                            MATCH (et:${EntryType} {id: ${edit.data.id}})
                            WITH et
                            UNWIND ${edit.data.addOrUpdateComputedFacts} AS newFact
                            MERGE (et)-[:${EntryType.rel.HAS_COMPUTED_FACT}]->(cf:${ComputedFact} {id: newFact.id})
                            SET cf.label = newFact.label
                            SET cf.importance = newFact.importance
                            SET cf.expression = newFact.expression
                        `);
                        edit.data.addOrUpdateComputedFacts.forEach(cf => modifiedNodes.add(cf.id));
                    }
                    if (edit.data.removeComputedFacts?.length) {
                        await tx.queryOne(C`
                            MATCH (cf:${ComputedFact})<-[:${EntryType.rel.HAS_COMPUTED_FACT}]-(et:${EntryType} {id: ${edit.data.id}})
                            WHERE cf.id IN ${edit.data.removeComputedFacts}
                            SET cf:DeletedVNode
                            REMOVE cf:VNode
                        `.RETURN({}));
                        edit.data.removeComputedFacts.forEach(cfId => modifiedNodes.add(cfId));
                    }
                    modifiedNodes.add(edit.data.id);
                    break;
                }
                case CreateRelationshipType.code: {  // Create a new RelationshipType
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site)
                        SET rt += ${{
                            nameForward: edit.data.nameForward,
                            nameReverse: edit.data.nameReverse,
                            category: edit.data.category,
                        }}
                    `.RETURN({}));
                    modifiedNodes.add(edit.data.id);
                    break;
                }
                case UpdateRelationshipType.code: {  // Update a RelationshipType

                    const changes: any = {}
                    // Be sure we only set allowed properties onto the EditType VNode:
                    if (edit.data.nameForward !== undefined) changes.nameForward = edit.data.nameForward;
                    if (edit.data.nameReverse !== undefined) changes.nameReverse = edit.data.nameReverse;
                    if (edit.data.description !== undefined) changes.description = edit.data.description;
                    // "category" is omitted because it's not allowed to change.
                    // (Would cause data issues with existing relationships of the old category.)

                    const rtExistingData = await tx.queryOne(C`
                        MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET rt += ${changes}
                    `.RETURN({"rt.category": Field.String}));

                    if (edit.data.removeFromTypes) {
                        await tx.query(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (rt)-[rel:${RelationshipType.rel.FROM_ENTRY_TYPE}]->(et:${EntryType})
                            WHERE et.id IN ${edit.data.removeFromTypes}
                            DELETE rel
                        `);
                    }
                    if (edit.data.removeToTypes) {
                        await tx.query(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (rt)-[rel:${RelationshipType.rel.TO_ENTRY_TYPE}]->(et:${EntryType})
                            WHERE et.id IN ${edit.data.removeToTypes}
                            DELETE rel
                        `);
                    }
                    if (edit.data.addFromTypes) {
                        await tx.query(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            WHERE et.id IN ${edit.data.addFromTypes}
                            MERGE (rt)-[:${RelationshipType.rel.FROM_ENTRY_TYPE}]->(et)
                        `);
                    }
                    if (edit.data.addToTypes) {
                        const created = await tx.query(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            WHERE et.id IN ${edit.data.addToTypes}
                            MERGE (rt)-[:${RelationshipType.rel.TO_ENTRY_TYPE}]->(et)
                        `.RETURN({"et.contentType": Field.String}));
                        if (created.length !== edit.data.addToTypes.length) {
                            throw new Error(`UpdateRelationshipType.addToTypes failed: One or more of the "to" entry type IDs was invalid.`);
                        }
                        if (rtExistingData["rt.category"] === RelationshipCategory.HAS_PROPERTY) {
                            if (!created.every(et => et["et.contentType"] === ContentType.Property)) {
                                throw new Error(`UpdateRelationshipType.addToTypes: Cannot create a HAS_PROPERTY RelationshipType to an EntryType unless that EntryType has ContentType=Property`);
                            }
                        }
                    }
                    modifiedNodes.add(edit.data.id);
                    break;
                }

                default:
                    throw new Error(`Unknown/unsupported edit type: ${(edit as any).code}`);
            }
        }

        return {
            resultData: {},
            modifiedNodes: [...modifiedNodes],
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
