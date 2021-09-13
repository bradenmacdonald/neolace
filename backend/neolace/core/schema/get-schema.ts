import {
    EditList,
    CastContentType,
    CastRelationshipCategory,
    SimplePropertyData,
    EntryTypeData,
    RelationshipTypeData,
    SiteSchemaData,
    UpdateRelationshipType,
} from "neolace/deps/neolace-api.ts";
import { C, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Type } from "neolace/deps/computed-types.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";

export async function getCurrentSchema(tx: WrappedTransaction, siteId: VNID): Promise<SiteSchemaData> {
    const result: SiteSchemaData = {
        entryTypes: {},
        relationshipTypes: {},
    };
    const siteFilter = C`(@this)-[:FOR_SITE]->(:${Site} {id: ${siteId}})`;

    const entryTypes = await tx.pull(
        EntryType,
        et => et.id.name.contentType.description.friendlyIdPrefix.simplePropValues(cf => cf.id.label.valueExpression.importance.note),
        {where: siteFilter},
    );

    entryTypes.forEach(et => {
        result.entryTypes[et.id] = {
            id: et.id,
            name: et.name,
            contentType: CastContentType(et.contentType),
            description: et.description,
            friendlyIdPrefix: et.friendlyIdPrefix,
            simplePropValues: Object.fromEntries(et.simplePropValues.map(cf => [cf.id, cf])),
        };
    });

    const relationshipTypes = await tx.pull(
        RelationshipType,
        rt => rt.id.nameForward.nameReverse.category.description.fromTypes(et => et.id).toTypes(et => et.id),
        {where: siteFilter},
    );

    relationshipTypes.forEach(rt => {
        result.relationshipTypes[rt.id] = {
            id: rt.id,
            nameForward: rt.nameForward,
            nameReverse: rt.nameReverse,
            description: rt.description,
            // For consistency and to make tests easier, "from" and "to" IDs are sorted by ID.
            fromEntryTypes: rt.fromTypes.map(et => et.id).sort(),
            toEntryTypes: rt.toTypes.map(et => et.id).sort(),
            category: CastRelationshipCategory(rt.category),
        };
    });

    return Object.freeze(result);
}


/** Get all elements of Set A that are not in Set B */
function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const difference = new Set(setA);
    for (const elem of setB) {
        difference.delete(elem);
    }
    return difference;
}


export function diffSchema(oldSchema: Readonly<SiteSchemaData>, newSchema: Readonly<SiteSchemaData>): {edits: EditList} {

    const result: {edits: EditList} = {edits: []};

    // Do some quick validation of the schema IDs:
    for (const [id, val] of [
        ...Object.entries(oldSchema.entryTypes),
        ...Object.entries(oldSchema.relationshipTypes),
        ...Object.entries(newSchema.entryTypes),
        ...Object.entries(newSchema.relationshipTypes),
    ]) {
        if (val.id !== id) {
            throw new Error(`Invalid schema: the key of an entry/relationship type doesn't match its ID.`);
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    {// Entry Types:
        const oldEntryTypeIds = new Set(Object.keys(oldSchema.entryTypes));
        const newEntryTypeIds = new Set(Object.keys(newSchema.entryTypes));

        // Delete any removed EntryTypes:
        const deletedEntryTypeIds = difference(oldEntryTypeIds, newEntryTypeIds);
        if (deletedEntryTypeIds.size > 0) {
            throw new Error("Deleting EntryTypes from the schema is not implemented.");
        }

        // Create any newly added EntryTypes:
        const addedEntryTypeIds = difference(newEntryTypeIds, oldEntryTypeIds);
        for (const newId of addedEntryTypeIds) {
            result.edits.push({code: "CreateEntryType", data: {
                id: newSchema.entryTypes[newId].id,
                name: newSchema.entryTypes[newId].name,
                contentType: newSchema.entryTypes[newId].contentType,
            } })
        }
        // Set properties on existing and new EntryTypes
        for (const entryTypeId of newEntryTypeIds) {
            const oldET: EntryTypeData|undefined = oldSchema.entryTypes[entryTypeId];
            const newET = newSchema.entryTypes[entryTypeId];
            // deno-lint-ignore no-explicit-any
            const changes: any = {};
            for (const key of ["name", "description", "friendlyIdPrefix"] as const) {
                if (key === "name" && addedEntryTypeIds.has(entryTypeId)) {
                    continue;  // Name was already set during the Create step, so skip that property
                }
                if (newET[key] !== oldET?.[key]) {
                    changes[key] = newET[key];
                }
            }
            // Check for changes to the computed facts:
            const finalSimplePropValueIds = new Set(Object.keys(newET.simplePropValues));  // The set of IDs in the new/final schema
            const addOrUpdateSimpleProperties: SimplePropertyData[] = [];
            Object.values(newET.simplePropValues).forEach(newCF => {
                const existingCF = oldET?.simplePropValues[newCF.id];
                if (existingCF) {
                    if (existingCF.id !== newCF.id) {
                        throw new Error("Computed fact id doesn't match key in simplePropValues object.");
                    }
                    if (newCF.label === existingCF.label && newCF.importance === existingCF.importance && newCF.valueExpression === existingCF.valueExpression && newCF.note === existingCF.note) {
                        // Nothing to do; this computed fact is already in the schema and unchanged.
                    } else {
                        // This computed fact has been modified:
                        addOrUpdateSimpleProperties.push(newCF);
                    }
                } else {
                    addOrUpdateSimpleProperties.push(newCF);
                }
            });
            if (addOrUpdateSimpleProperties.length > 0) {
                changes.addOrUpdateSimpleProperties = addOrUpdateSimpleProperties;
            }
            const removedSimpleProperties = oldET?.simplePropValues ? Object.keys(oldET.simplePropValues).filter(id => !finalSimplePropValueIds.has(id)) : [];
            if (removedSimpleProperties.length > 0) {
                changes.removeSimpleProperties = removedSimpleProperties;
            }
            if (Object.keys(changes).length > 0) {
                result.edits.push({code: "UpdateEntryType", data: {
                    id: entryTypeId,
                    ...changes,
                }});
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    {// Relationship Types:
        const oldRelTypeIds = new Set(Object.keys(oldSchema.relationshipTypes));
        const newRelTypeIds = new Set(Object.keys(newSchema.relationshipTypes));

        // Delete any removed RelationshipTypes:
        const deletedEntryTypeIds = difference(oldRelTypeIds, newRelTypeIds);
        if (deletedEntryTypeIds.size > 0) {
            throw new Error("Deleting RelationshipTypes from the schema is not implemented.");
        }

        // Create any newly added RelationshipTypes:
        const addedRelTypeIds = difference(newRelTypeIds, oldRelTypeIds);
        for (const newId of addedRelTypeIds) {
            result.edits.push({code: "CreateRelationshipType", data: {
                id: newSchema.relationshipTypes[newId].id,
                category: newSchema.relationshipTypes[newId].category,
                nameForward: newSchema.relationshipTypes[newId].nameForward,
                nameReverse: newSchema.relationshipTypes[newId].nameReverse,
            } })
        }
        // Set properties on existing and new RelationshipTypes
        for (const relTypeId of newRelTypeIds) {
            const oldRT: RelationshipTypeData|undefined = oldSchema.relationshipTypes[relTypeId];
            const newRT = newSchema.relationshipTypes[relTypeId];
            const changes: Partial<Type<typeof UpdateRelationshipType["dataSchema"]>> = {};

            if (!addedRelTypeIds.has(relTypeId)) {
                if (newRT.nameForward !== oldRT?.nameForward) { changes.nameForward = newRT.nameForward; }
                if (newRT.nameReverse !== oldRT?.nameReverse) { changes.nameReverse = newRT.nameReverse; }
            }

            {// Are there any new/removed "from entry types"? \\
                const oldIds = new Set(oldRT?.fromEntryTypes ?? []);
                const newIds = new Set(newRT.fromEntryTypes);
                const addedEntryTypes = difference(newIds, oldIds);
                if (addedEntryTypes.size > 0) { changes.addFromTypes = [...addedEntryTypes]; }
                const removedEntryTypes = difference(oldIds, newIds);
                if (removedEntryTypes.size > 0) { changes.removeFromTypes = [...removedEntryTypes]; }
            }
            {// Are there any new/removed "to entry types"? \\
                const oldIds = new Set(oldRT?.toEntryTypes ?? []);
                const newIds = new Set(newRT.toEntryTypes);
                const addedEntryTypes = difference(newIds, oldIds);
                if (addedEntryTypes.size > 0) { changes.addToTypes = [...addedEntryTypes]; }
                const removedEntryTypes = difference(oldIds, newIds);
                if (removedEntryTypes.size > 0) { changes.removeToTypes = [...removedEntryTypes]; }
            }
            
            if (Object.keys(changes).length > 0) {
                result.edits.push({code: "UpdateRelationshipType", data: {
                    id: VNID(relTypeId),
                    // deno-lint-ignore no-explicit-any
                    ...changes as any,
                }});
            }
        }
    }

    return result;
}
