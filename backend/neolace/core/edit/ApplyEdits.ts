// deno-lint-ignore-file no-explicit-any
import {
    AddPropertyValue,
    CreateEntry,
    CreateEntryType,
    CreateProperty,
    DeletePropertyValue,
    EditList,
    getEditType,
    InvalidEdit,
    PropertyMode,
    PropertyType,
    UpdateEntryFeature,
    UpdateEntryType,
    UpdateEntryTypeFeature,
    UpdateProperty,
    UpdatePropertyValue,
} from "neolace/deps/neolace-api.ts";
import { C, defineAction, EmptyResultError, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "../Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { directRelTypeForPropertyType, PropertyFact } from "neolace/core/entry/PropertyFact.ts";
import { features } from "neolace/core/entry/features/all-features.ts";
import { Property } from "neolace/core/schema/Property.ts";

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

        for (const edit of data.edits) {
            const editTypeDefinition = getEditType(edit.code);
            const description = editTypeDefinition.describe(edit.data);
            descriptions.push(description);

            switch (edit.code) {
                case CreateEntry.code: { // Create a new Entry of a specific EntryType
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
                    const feature = features.find((f) => f.featureType === edit.data.feature.featureType);
                    if (feature === undefined) {
                        throw new Error(`Unknown feature type ${edit.data.feature.featureType}`);
                    }

                    // Validate that the entry exists, is part of the correct site, and that its type has this feature enabled:
                    try {
                        await tx.queryOne(C`
                            MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
                        `.RETURN({})); // If this returns a single result, we're good; otherwise it will throw an error.
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new Error(
                                "Cannot set feature data for that entry - either the feature is not enabled or the entry ID is invalid.",
                            );
                        }
                    }

                    // Edit the feature:
                    await feature.editFeature(
                        edit.data.entryId,
                        edit.data.feature as any,
                        tx,
                        (id) => modifiedNodes.add(id),
                        data.draftId,
                    );

                    modifiedNodes.add(edit.data.entryId);
                    break;
                }

                case AddPropertyValue.code: {
                    const valueExpression = edit.data.valueExpression;
                    const updatedPropertyFactFields: Record<string, unknown> = {
                        valueExpression: edit.data.valueExpression,
                        note: edit.data.note,
                        slot: "",
                    };
                    if (edit.data.rank !== undefined) {
                        updatedPropertyFactFields.rank = BigInt(edit.data.rank);
                    }
                    if (edit.data.slot !== undefined) {
                        updatedPropertyFactFields.slot = edit.data.slot;
                    }

                    // Validate the entry ID, property ID, and ensure they're part of the current site.
                    // Then create the new property fact.
                    let baseData;
                    try {
                        baseData = await tx.queryOne(C`
                            MATCH (site:${Site} {id: ${siteId}})
                            MATCH (entry:${Entry} {id: ${edit.data.entry}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            // Ensure that the property (still) applies to this entry type:
                            MATCH (property:${Property} {id: ${edit.data.property}})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
                            // Set the rank automatically by default:
                            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(existingPf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
                            WITH entry, property, max(existingPf.rank) AS maxCurrentRank
                            // Create the new property fact:
                            CREATE (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact} {id: ${edit.data.propertyFactId}})
                            CREATE (pf)-[:${PropertyFact.rel.FOR_PROP}]->(property)
                            SET pf.rank = CASE WHEN maxCurrentRank IS NULL THEN 1 ELSE maxCurrentRank + 1 END
                            SET pf += ${updatedPropertyFactFields}
                        `.RETURN({
                            "property.type": Field.String,
                        }));
                    } catch (err) {
                        if (err instanceof EmptyResultError) {
                            // Was the property not found, or does it not apply to that entry type?
                            const checkProperties = await tx.query(C`
                                MATCH (property:${Property} {id: ${edit.data.property}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            `.RETURN({ "property.name": Field.String }));
                            if (checkProperties.length === 0) {
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    { propertyId: edit.data.property },
                                    `Property with ID ${edit.data.property} was not found in the site's schema.`,
                                );
                            } else {
                                // If we get there, the property exists but doesn't apply to that entry type.
                                const propertyName = checkProperties[0]["property.name"];
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    { propertyId: edit.data.property, propertyName, entryId: edit.data.entry },
                                    `The "${propertyName}" property does not apply to entries of that type.`,
                                );
                            }
                        } else {
                            throw err;
                        }
                    }
                    const propType = baseData["property.type"] as PropertyType;
                    const directRelType = directRelTypeForPropertyType(propType); // If this is a relationship property, there is a relationship of this type directly between two entries
                    if (directRelType !== null) {
                        // This is a relationship property, verify that the Entry it will be pointing to exists and is
                        // part of the same site.
                        if (!valueExpression.startsWith(`[[/entry/`) || !valueExpression.endsWith(`]]`)) {
                            throw new Error(`Relationship property values must be of the format [[/entry/entry-id]]`);
                        }
                        // There is a relationship FROM the current entry TO the entry with this id:
                        const toEntryId = valueExpression.slice(9, -2);

                        // We also need to create/update a direct (Entry)-[rel]->(Entry) relationship on the graph.
                        await tx.query(C`
                            MATCH (entry:${Entry} {id: ${edit.data.entry}})
                            // Match the target entry and make sure it's part of the same site:
                            MATCH (toEntry:${Entry} {id: ${toEntryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                            MATCH (pf:${PropertyFact} {id: ${edit.data.propertyFactId}})
                            MERGE (entry)-[rel:${directRelType}]->(toEntry)  // Note that this may already exist if multiple separate properties of the same relationship type point to the same node
                            SET pf.directRelNeo4jId = id(rel)

                        `.RETURN({ "pf.directRelNeo4jId": Field.BigInt }));
                    }

                    // Changing a property value always counts as modifying the entry:
                    modifiedNodes.add(edit.data.entry);
                    modifiedNodes.add(edit.data.propertyFactId);
                    break;
                }

                case UpdatePropertyValue.code: {
                    throw new Error("UpdatePropertyValue is not yet implemented.");
                }

                case DeletePropertyValue.code: {
                    const propertyFactId = edit.data.propertyFactId;
                    let modifiedEntry;
                    try {
                        modifiedEntry = await tx.queryOne(C`
                            MATCH (pf:${PropertyFact} {id: ${propertyFactId}})-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
                            MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(e:${Entry})
                            MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (e)-[rel]->(e2) WHERE pf.directRelNeo4jId = id(rel)
                            DETACH DELETE pf, rel   
                        `.RETURN({ "e.id": Field.VNID }));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                DeletePropertyValue.code,
                                { propertyFactId: propertyFactId },
                                `Property ${propertyFactId} does not exist on this site.`,
                            );
                        } else {
                            throw err;
                        }
                    }

                    modifiedNodes.add(propertyFactId);
                    modifiedNodes.add(modifiedEntry["e.id"]);

                    break;
                }

                case CreateEntryType.code: { // Create a new EntryType
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

                case UpdateEntryType.code: { // Update an EntryType
                    const changes: any = {};
                    // Be sure we only set allowed properties onto the EditType VNode:
                    if (edit.data.name !== undefined) changes.name = edit.data.name;
                    if (edit.data.description !== undefined) changes.description = edit.data.description;
                    if (edit.data.friendlyIdPrefix !== undefined) changes.friendlyIdPrefix = edit.data.friendlyIdPrefix;

                    // The following query will also validate that the entry type exists and is linked to the site.
                    await tx.queryOne(C`
                        MATCH (et:${EntryType} {id: ${edit.data.id}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        SET et += ${changes}
                    `.RETURN({}));
                    modifiedNodes.add(edit.data.id);
                    break;
                }

                case UpdateEntryTypeFeature.code: { // Update a feature of a specific entry type
                    const feature = features.find((f) => f.featureType === edit.data.feature.featureType);
                    if (feature === undefined) {
                        throw new Error(`Unknown feature type ${edit.data.feature.featureType}`);
                    }
                    if (edit.data.feature.enabled) {
                        // First verify the entry type ID is from the correct site (a security issue):
                        await tx.queryOne(C`
                            MATCH (et:${EntryType} {id: ${edit.data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        `.RETURN({}));
                        // Now update it:
                        await feature.updateConfiguration(
                            edit.data.entryTypeId,
                            edit.data.feature.config as any,
                            tx,
                            (id) => modifiedNodes.add(id),
                        );
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

                case CreateProperty.code: // Create a new property (in the schema)
                    await tx.queryOne(C`
                        MATCH (site:${Site} {id: ${siteId}})
                        CREATE (p:${Property} {id: ${edit.data.id}})
                        MERGE (p)-[:${Property.rel.FOR_SITE}]->(site)
                        SET p += ${{
                        name: "New Property",
                        descriptionMD: "",
                        importance: 15,
                        // Property type - note that this cannot be changed once the property is created.
                        type: edit.data.type ?? PropertyType.Value,
                        mode: PropertyMode.Optional,
                        inheritable: edit.data.inheritable ?? false,
                        standardURL: "",
                        editNoteMD: "",
                        displayAs: "",
                        default: "",
                        enableSlots: false,
                    }}
                    `.RETURN({}));
                    /* falls through */
                case UpdateProperty.code: {
                    // update the "appliesTo" of this property:
                    if (edit.data.appliesTo !== undefined) {
                        const newAppliesToIds = edit.data.appliesTo.map((at) => at.entryType);
                        // Create new "applies to" links:
                        await tx.query(C`
                            MATCH (p:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            UNWIND ${newAppliesToIds} as entryTypeId
                            MATCH (et:${EntryType} {id: entryTypeId})-[:${EntryType.rel.FOR_SITE}]->(site)
                            MERGE (p)-[:${Property.rel.APPLIES_TO_TYPE}]->(et)
                        `.RETURN({}));
                        // Delete old "applies to" links:
                        await tx.query(C`
                            MATCH (p:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (p)-[rel:${Property.rel.APPLIES_TO_TYPE}]->(et:${EntryType})
                            WHERE NOT et.id IN ${newAppliesToIds}
                            DELETE rel
                        `.RETURN({}));
                    }
                    // update the "isA" of this property:
                    if (edit.data.isA !== undefined) {
                        const newParentIds = edit.data.isA;
                        // Create new "is a" / parent property links:
                        await tx.query(C`
                            MATCH (p:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            UNWIND ${newParentIds} as parentId
                            MATCH (pp:${Property} {id: parentId})-[:${EntryType.rel.FOR_SITE}]->(site)
                            MERGE (p)-[:${Property.rel.HAS_PARENT_PROP}]->(pp)
                        `.RETURN({}));
                        // Delete old "is a" / parent property links:
                        await tx.query(C`
                            MATCH (p:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (p)-[rel:${Property.rel.HAS_PARENT_PROP}]->(pp)
                            WHERE NOT pp.id IN ${newParentIds}
                            DELETE rel
                        `.RETURN({}));
                    }

                    // Other fields:
                    const changes: Record<string, unknown> = {};
                    for (
                        const field of [
                            "name",
                            "descriptionMD",
                            "mode",
                            "valueConstraint",
                            "default",
                            "inheritable",
                            "standardURL",
                            "importance",
                            "displayAs",
                            "editNoteMD",
                            "enableSlots",
                        ] as const
                    ) {
                        if (edit.data[field] !== undefined) {
                            changes[field] = edit.data[field];
                        }
                    }
                    // The following will also throw an exception if the property is not part of the current site, so
                    // we always run this query even if changes is empty.
                    await tx.queryOne(C`
                        MATCH (p:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                        SET p += ${changes}
                    `.RETURN({}));
                    modifiedNodes.add(edit.data.id);
                    break;
                }

                default:
                    throw new Error(`Cannot apply unknown/unsupported edit type: ${(edit as any).code}`);
            }
        }

        return {
            resultData: {},
            modifiedNodes: [...modifiedNodes],
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
