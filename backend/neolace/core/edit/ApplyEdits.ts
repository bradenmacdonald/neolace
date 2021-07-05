// deno-lint-ignore-file no-explicit-any
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
            descriptions.push(editTypeDefinition.describe(edit.data));

            switch (edit.code) {

                case CreateEntry.code: {  // Create a new EntryType
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
                    const safeNewRelType = category;  // The relationship from this RelationshipFact to the "to Entry" will be of this type, e.g. IS_A, HAS_A, etc.

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
                        CREATE (rf)-[:${C(safeNewRelType)}]->(toEntry)
                        CREATE (fromEntry)-[:${Entry.rel.HAS_REL_FACT}]->(rf)
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
                            contentType: ContentType.None,
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
                    if (edit.data.contentType !== undefined) changes.contentType = edit.data.contentType;
                    if (edit.data.friendlyIdPrefix !== undefined) changes.friendlyIdPrefix = edit.data.friendlyIdPrefix;

                    await tx.queryOne(C`
                        MATCH (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET et += ${changes}
                    `.RETURN({}));
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

                    if (Object.keys(changes).length > 0) {
                        await tx.queryOne(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            SET rt += ${changes}
                        `.RETURN({}));
                    }

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
                            CREATE (rt)-[:${RelationshipType.rel.FROM_ENTRY_TYPE}]->(et)
                        `);
                    }
                    if (edit.data.addToTypes) {
                        await tx.query(C`
                            MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            WHERE et.id IN ${edit.data.addToTypes}
                            CREATE (rt)-[:${RelationshipType.rel.TO_ENTRY_TYPE}]->(et)
                        `);
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
