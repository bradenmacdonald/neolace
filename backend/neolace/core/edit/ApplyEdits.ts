// deno-lint-ignore-file no-explicit-any
import * as log from "std/log/mod.ts";
import {
    EditList,
    CreateEntry,
    CreateEntryType,
    CreateRelationshipFact,
    CreateRelationshipType,
    UpdateEntryType,
    UpdateEntryTypeFeature,
    UpdatePropertyValue,
    UpdateRelationshipType,
    getEditType,
    RelationshipCategory,
    UpdateEntryFeature,
} from "neolace/deps/neolace-api.ts";
import { C, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "../Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { UseAsPropertyEnabled } from "neolace/core/entry/features/UseAsProperty/UseAsPropertyEnabled.ts";
import { SimplePropertyValue } from "neolace/core/schema/SimplePropertyValue.ts";
import { features } from "neolace/core/entry/features/all-features.ts";

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

                case UpdateEntryFeature.code: {
                    // Load details of the feature that we're editing:
                    const feature = features.find(f => f.featureType === edit.data.feature.featureType);
                    if (feature === undefined) {
                        throw new Error(`Unknown feature type ${edit.data.feature.featureType}`);
                    }

                    // Validate that the entry exists, is part of the correct site, and that its type has this feature enabled:
                    await tx.queryOne(C`
                        MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
                    `.RETURN({}));  // If this returns a single result, we're good; otherwise it will throw an error.

                    // Edit the feature:
                    await feature.editFeature(edit.data.entryId, edit.data.feature as any, tx, id => modifiedNodes.add(id));

                    modifiedNodes.add(edit.data.entryId);
                    break;
                }

                case CreateRelationshipFact.code: {  // Create a new Relationship Fact (record a relationship between two Entries)

                    // Validate the relationship type and get its category
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

                case UpdatePropertyValue.code: {  // Create, Update, or Delete a property value

                    if (edit.data.valueExpression) {
                        // Create or update a property fact.
                        // This will ensure that each entry only ever has a single PropertyFact for a given property.
                        const result = await tx.queryOne(C`
                            MATCH (site:${Site} {id: ${siteId}})
                            MATCH (entry:${Entry} {id: ${edit.data.entry}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            MATCH (property:${Entry} {id: ${edit.data.property}})-[:${Entry.rel.IS_OF_TYPE}]->(propertyType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site),
                                  // Make sure the "property" entry type has the "use as property" feature enabled and that it can be applied to this entry type:
                                  (propertyType)-[:${EntryType.rel.HAS_FEATURE}]->(useAsPropFeature:${UseAsPropertyEnabled})-[:${UseAsPropertyEnabled.rel.APPLIES_TO}]->(entryType)

                            MERGE (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(property)
                            ON CREATE SET pf.id = ${VNID()}
                            SET pf.valueExpression = ${edit.data.valueExpression}
                            SET pf.note = ${edit.data.note}
                        `.RETURN({"pf.id": Field.VNID}));

                        modifiedNodes.add(edit.data.entry);
                        modifiedNodes.add(result["pf.id"]);
                    } else {
                        // We are deleting a property fact, if it is set
                        const result = await tx.query(C`
                            MATCH (site:${Site} {id: ${siteId}})
                            MATCH (entry:${Entry} {id: ${edit.data.entry}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            MATCH (property:${Entry} {id: ${edit.data.property}})-[:${Entry.rel.IS_OF_TYPE}]->(propertyType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)

                            MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact})-[:${PropertyFact.rel.PROP_ENTRY}]->(property)
                            SET pf:DeletedVNode
                            REMOVE pf:VNode
                        `.RETURN({"pf.id": Field.VNID}));

                        if (result.length > 0) {
                            modifiedNodes.add(result[0]["pf.id"]);
                        }
                    }
                    // We are modifying the PROP_FACT relationship from the entry, so the entry is counted as modified too:
                    modifiedNodes.add(edit.data.entry);
                    break;
                }

                case CreateEntryType.code: {  // Create a new EntryType
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site)
                        SET et += ${{
                            name: edit.data.name,
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
                    if (edit.data.addOrUpdateSimpleProperties?.length) {
                        await tx.query(C`
                            MATCH (et:${EntryType} {id: ${edit.data.id}})
                            WITH et
                            UNWIND ${edit.data.addOrUpdateSimpleProperties} AS newFact
                            MERGE (et)-[:${EntryType.rel.HAS_SIMPLE_PROP}]->(spv:${SimplePropertyValue} {id: newFact.id})
                            SET spv.label = newFact.label
                            SET spv.importance = newFact.importance
                            SET spv.valueExpression = newFact.valueExpression
                            SET spv.note = newFact.note
                        `);
                        edit.data.addOrUpdateSimpleProperties.forEach(spv => modifiedNodes.add(spv.id));
                    }
                    if (edit.data.removeSimpleProperties?.length) {
                        await tx.queryOne(C`
                            MATCH (spv:${SimplePropertyValue})<-[:${EntryType.rel.HAS_SIMPLE_PROP}]-(et:${EntryType} {id: ${edit.data.id}})
                            WHERE spv.id IN ${edit.data.removeSimpleProperties}
                            SET spv:DeletedVNode
                            REMOVE spv:VNode
                        `.RETURN({}));
                        edit.data.removeSimpleProperties.forEach(cfId => modifiedNodes.add(cfId));
                    }
                    modifiedNodes.add(edit.data.id);
                    break;
                }

                case UpdateEntryTypeFeature.code: {  // Update a feature of a specific entry type
                    const feature = features.find(f => f.featureType === edit.data.feature.featureType);
                    if (feature === undefined) {
                        throw new Error(`Unknown feature type ${edit.data.feature.featureType}`);
                    }
                    if (edit.data.feature.enabled) {
                        // First verify the entry type ID is from the correct site (a security issue):
                        await tx.queryOne(C`
                            MATCH (et:${EntryType} {id: ${edit.data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        `.RETURN({}));
                        // Now update it:
                        await feature.updateConfiguration(edit.data.entryTypeId, edit.data.feature.config as any, tx, id => modifiedNodes.add(id));
                    } else {
                        await tx.query(C`
                            MATCH (et:${EntryType} {id: ${edit.data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
                            DETACH DELETE feature
                        `);
                    }
                    modifiedNodes.add(edit.data.entryTypeId);
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

                    await tx.queryOne(C`
                        MATCH (rt:${RelationshipType} {id: ${edit.data.id}})-[:${RelationshipType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET rt += ${changes}
                    `.RETURN({}));

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
