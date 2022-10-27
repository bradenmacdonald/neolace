// deno-lint-ignore-file no-explicit-any
import {
    AddPropertyValue,
    CreateEntry,
    CreateEntryType,
    CreateProperty,
    DeleteEntry,
    DeleteEntryType,
    DeleteProperty,
    DeletePropertyValue,
    EditList,
    EntryTypeColor,
    getEditType,
    InvalidEdit,
    PropertyMode,
    PropertyType,
    SetEntryDescription,
    SetEntryFriendlyId,
    SetEntryName,
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
import {
    directRelTypeForPropertyType,
    parseLookupExpressionToEntryId,
    PropertyFact,
} from "neolace/core/entry/PropertyFact.ts";
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
                    if (edit.data.friendlyId.length > 55) {
                        throw new InvalidEdit(
                            CreateEntry.code,
                            { entryId: edit.data.id },
                            `The friendlyId "${edit.data.friendlyId}" is too long.`,
                        );
                    }
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

                case SetEntryName.code: {
                    try {
                        await tx.queryOne(C`
                            MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            SET e.name = ${edit.data.name}
                        `.RETURN({}));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                SetEntryName.code,
                                { entryId: edit.data.entryId },
                                "Cannot set change the entry's name - entry does not exist.",
                            );
                        }
                        throw err;
                    }
                    modifiedNodes.add(edit.data.entryId);
                    break;
                }

                case SetEntryFriendlyId.code: {
                    try {
                        await tx.queryOne(C`
                            MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            SET e.slugId = site.siteCode + ${edit.data.friendlyId}
                        `.RETURN({}));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                SetEntryFriendlyId.code,
                                { entryId: edit.data.entryId },
                                "Cannot set change the entry's friendly ID - entry does not exist.",
                            );
                        }
                        throw err;
                    }
                    modifiedNodes.add(edit.data.entryId);
                    break;
                }

                case SetEntryDescription.code: {
                    try {
                        await tx.queryOne(C`
                            MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            SET e.description = ${edit.data.description}
                        `.RETURN({}));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                SetEntryName.code,
                                { entryId: edit.data.entryId },
                                "Cannot set change the entry's description - entry does not exist.",
                            );
                        }
                        throw err;
                    }
                    modifiedNodes.add(edit.data.entryId);
                    break;
                }

                case UpdateEntryFeature.code: {
                    // Load details of the feature that we're editing:
                    const feature = features.find((f) => f.featureType === edit.data.feature.featureType);
                    if (feature === undefined) {
                        throw new InvalidEdit(
                            UpdateEntryFeature.code,
                            { featureType: edit.data.feature.featureType },
                            `Unknown feature type ${edit.data.feature.featureType}`,
                        );
                    }

                    // Validate that the entry exists, is part of the correct site, and that its type has this feature enabled:
                    try {
                        await tx.queryOne(C`
                            MATCH (e:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            MATCH (et)-[rel:${EntryType.rel.HAS_FEATURE}]->(feature:${feature.configClass})
                        `.RETURN({})); // If this returns a single result, we're good; otherwise it will throw an error.
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                UpdateEntryFeature.code,
                                { featureType: edit.data.feature.featureType, entryId: edit.data.entryId },
                                "Cannot set feature data for that entry - either the feature is not enabled or the entry ID is invalid.",
                            );
                        }
                        throw err;
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
                        valueExpression,
                        note: edit.data.note ?? "",
                        slot: edit.data.slot ?? "",
                    };
                    if (edit.data.rank !== undefined) {
                        updatedPropertyFactFields.rank = BigInt(edit.data.rank);
                    }

                    // Validate the entry ID, property ID, and ensure they're part of the current site.
                    // Then create the new property fact.
                    let baseData;
                    try {
                        baseData = await tx.queryOne(C`
                            MATCH (site:${Site} {id: ${siteId}})
                            MATCH (entry:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
                            // Ensure that the property (still) applies to this entry type:
                            MATCH (property:${Property} {id: ${edit.data.propertyId}})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
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
                                MATCH (property:${Property} {id: ${edit.data.propertyId}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            `.RETURN({ "property.name": Field.String }));
                            if (checkProperties.length === 0) {
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    { propertyId: edit.data.propertyId },
                                    `Property with ID ${edit.data.propertyId} was not found in the site's schema.`,
                                );
                            } else {
                                // If we get there, the property exists but doesn't apply to that entry type.
                                const propertyName = checkProperties[0]["property.name"];
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    { propertyId: edit.data.propertyId, propertyName, entryId: edit.data.entryId },
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
                        // There is a relationship FROM the current entry TO the entry with this id:
                        const toEntryId = parseLookupExpressionToEntryId(valueExpression);

                        // We also need to create/update a direct (Entry)-[rel]->(Entry) relationship on the graph.
                        try {
                            await tx.queryOne(C`
                                MATCH (entry:${Entry} {id: ${edit.data.entryId}})
                                // Match the target entry and make sure it's part of the same site:
                                MATCH (toEntry:${Entry} {id: ${toEntryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                                MATCH (pf:${PropertyFact} {id: ${edit.data.propertyFactId}})
                                CREATE (entry)-[rel:${directRelType}]->(toEntry)
                                SET pf.directRelNeo4jId = id(rel)
                            `.RETURN({ "pf.directRelNeo4jId": Field.BigInt }));
                        } catch (err) {
                            if (err instanceof EmptyResultError) {
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    {
                                        propertyId: edit.data.propertyId,
                                        toEntryId: toEntryId,
                                        fromEntryId: edit.data.entryId,
                                    },
                                    `Target entry not found - cannot set that non-existent entry as a relationship property value.`,
                                );
                            } else {
                                throw err; // Other unknown internal error.
                            }
                        }
                    }

                    // Changing a property value always counts as modifying the entry:
                    modifiedNodes.add(edit.data.entryId);
                    modifiedNodes.add(edit.data.propertyFactId);
                    break;
                }

                case UpdatePropertyValue.code: {
                    const propertyFactId = edit.data.propertyFactId;
                    const updatedFields: Record<string, unknown> = {};
                    if (edit.data.valueExpression !== undefined) {
                        updatedFields.valueExpression = edit.data.valueExpression;
                    }
                    if (edit.data.note !== undefined) updatedFields.note = edit.data.note;
                    if (edit.data.rank !== undefined) updatedFields.rank = BigInt(edit.data.rank);
                    if (edit.data.slot !== undefined) updatedFields.slot = edit.data.slot;

                    if (Object.keys(updatedFields).length === 0) {
                        break; // No changes to apply, actually.
                    }

                    let baseData;
                    try {
                        baseData = await tx.queryOne(C`
                            MATCH (pf:${PropertyFact} {id: ${propertyFactId}})-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
                            MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(e:${Entry} {id: ${edit.data.entryId}})
                            MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            WITH pf, e.id AS entryId, e.valueExpression AS originalValue, property.type AS propertyType
                            SET pf += ${updatedFields}
                            WITH entryId, originalValue, propertyType, pf.valueExpression AS newValue
                        `.RETURN({
                            entryId: Field.VNID,
                            originalValue: Field.String,
                            propertyType: Field.String,
                            newValue: Field.String,
                        }));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                UpdatePropertyValue.code,
                                { entryId: edit.data.entryId, propertyFactId: propertyFactId },
                                `That property fact does not exist on that entry.`,
                            );
                        } else {
                            throw err;
                        }
                    }

                    const propType = baseData.propertyType as PropertyType;
                    const directRelType = directRelTypeForPropertyType(propType); // If this is a relationship property, there is a relationship of this type directly between two entries
                    if (directRelType !== null && baseData.newValue !== baseData.originalValue) {
                        // We have changed the value of a relationship property, so we have to ensure the target entry
                        // exists and update the direct relationship between the entries:
                        // There is a relationship FROM the current entry TO the entry with this id:
                        const toEntryId = parseLookupExpressionToEntryId(baseData.newValue);

                        // We also need to update a direct (Entry)-[rel]->(Entry) relationship on the graph.
                        try {
                            await tx.queryOne(C`
                                // Get the property fact and the "from entry":
                                MATCH (pf:${PropertyFact} {id: ${propertyFactId}})<-[:${Entry.rel.PROP_FACT}]-(entry:${Entry})
                                // Match the target entry and make sure it's part of the same site:
                                MATCH (toEntry:${Entry} {id: ${toEntryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                                // Delete the existing relationship:
                                MATCH (entry)-[oldRel]->(oldEntry:${Entry}) WHERE pf.directRelNeo4jId = id(oldRel)
                                DELETE oldRel
                                CREATE (entry)-[rel:${directRelType}]->(toEntry)
                                SET pf.directRelNeo4jId = id(rel)
                            `.RETURN({ "pf.directRelNeo4jId": Field.BigInt }));
                        } catch (err) {
                            if (err instanceof EmptyResultError) {
                                throw new InvalidEdit(
                                    AddPropertyValue.code,
                                    {
                                        propertyFactId: edit.data.propertyFactId,
                                        toEntryId: toEntryId,
                                        fromEntryId: baseData.entryId,
                                    },
                                    `Target entry not found - cannot set that non-existent entry as an updated relationship property value.`,
                                );
                            } else {
                                throw err; // Other unknown internal error.
                            }
                        }
                    }

                    // Changing a property value always counts as modifying the entry:
                    modifiedNodes.add(baseData.entryId);
                    modifiedNodes.add(propertyFactId);
                    break;
                }

                case DeletePropertyValue.code: {
                    const propertyFactId = edit.data.propertyFactId;
                    let modifiedEntry;
                    try {
                        modifiedEntry = await tx.queryOne(C`
                            MATCH (pf:${PropertyFact} {id: ${propertyFactId}})-[:${PropertyFact.rel.FOR_PROP}]->(property:${Property})
                            MATCH (pf)<-[:${Entry.rel.PROP_FACT}]-(e:${Entry} {id: ${edit.data.entryId}})
                            MATCH (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                            // If it's a relationship property, we also have to delete the direct relationship:
                            OPTIONAL MATCH (e)-[rel]->(e2) WHERE pf.directRelNeo4jId = id(rel)
                            DETACH DELETE pf, rel   
                        `.RETURN({ "e.id": Field.VNID }));
                    } catch (err: unknown) {
                        if (err instanceof EmptyResultError) {
                            throw new InvalidEdit(
                                DeletePropertyValue.code,
                                { propertyFactId: propertyFactId },
                                `That property fact does not exist on that entry.`,
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
                        CREATE (et:${EntryType} {id: ${edit.data.id}})
                        CREATE (et)-[:${EntryType.rel.FOR_SITE}]->(site)
                        SET et += ${{
                        name: edit.data.name,
                        description: "",
                        friendlyIdPrefix: "",
                        color: EntryTypeColor.Default,
                        abbreviation: "",
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
                    if (edit.data.color !== undefined) changes.color = edit.data.color;
                    if (edit.data.colorCustom !== undefined) changes.colorCustom = edit.data.colorCustom;
                    if (edit.data.abbreviation !== undefined) changes.abbreviation = edit.data.abbreviation;

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

                case DeleteEntryType.code: { // Delete an EntryType
                    const baseQuery = C`
                        MATCH (site:${Site} {id: ${siteId}})
                        MATCH (et:${EntryType} {id: ${edit.data.entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
                    `;
                    // First make sure no entries exist:
                    const checkEntries = await tx.query(C`
                        ${baseQuery}
                        MATCH (e:${Entry})-[:${Entry.rel.IS_OF_TYPE}]->(et)
                    `.RETURN({}));
                    if (checkEntries.length > 0) {
                        throw new InvalidEdit(
                            DeleteEntryType.code,
                            { entryTypeId: edit.data.entryTypeId },
                            `Entry types cannot be deleted while there are still entries of that type.`,
                        );
                    }
                    await tx.queryOne(C`
                        ${baseQuery}
                        DETACH DELETE (et)
                    `.RETURN({}));
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
                        rank: 15,
                        // Property type - note that this cannot be changed once the property is created.
                        type: edit.data.type ?? PropertyType.Value,
                        mode: PropertyMode.Optional,
                        inheritable: edit.data.inheritable ?? false,
                        standardURL: "",
                        editNoteMD: "",
                        displayAs: "",
                        default: "",
                        valueConstraint: "",
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
                            "rank",
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

                case DeleteProperty.code: {
                    // Before we delete the property, check if it has any matching values:
                    const checkExtantValues = await tx.queryOne(C`
                        MATCH (property:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        MATCH (pf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
                    `.RETURN({ "count(pf)": Field.Int }));
                    const factsCount = checkExtantValues["count(pf)"];
                    if (factsCount > 0) {
                        throw new InvalidEdit(
                            DeleteProperty.code,
                            { propertyId: edit.data.id },
                            `Properties cannot be deleted while there are still entries with values set for that property.`,
                        );
                    }
                    // Now delete it:
                    await tx.queryOne(C`
                        MATCH (property:${Property} {id: ${edit.data.id}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
                        DETACH DELETE property
                    `.RETURN({}));
                    break;
                }

                case DeleteEntry.code: {
                    const entryMatch =
                        C`MATCH (entry:${Entry} {id: ${edit.data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})`;
                    // Before we delete the entry, check if it has any relationships:
                    const checkExtantRelationships = await tx.query(C`
                        ${entryMatch}
                        MATCH (entry)-[:${Entry.rel.IS_A}|${Entry.rel.RELATES_TO}]-(otherEntry:${Entry})
                    `.RETURN({}));
                    if (checkExtantRelationships.length > 0) {
                        throw new InvalidEdit(
                            DeleteEntry.code,
                            { entryId: edit.data.entryId },
                            `For now, entries with relationships cannot be deleted. Remove the relationships, then delete the entry.`,
                        );
                        // We may remove this restriction in the future.
                    }

                    // Now delete it:
                    await tx.queryOne(C`
                        ${entryMatch}
                        OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}|${Entry.rel.HAS_FEATURE_DATA}]->(data)
                        DETACH DELETE data
                        DETACH DELETE entry
                    `.RETURN({}));
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
