import { C, VNID, WrappedTransaction } from "vertex-framework";
import { Site } from "../Site";
import { EntryType } from "./EntryType";
import { RelationshipType } from "./RelationshipType";
import { CastContentType, CastRelationshipCategory, EditSet, EntryTypeData, SiteSchemaData } from "neolace-api";

export async function getCurrentSchema(tx: WrappedTransaction, siteId: VNID): Promise<SiteSchemaData> {
    const result: SiteSchemaData = {
        entryTypes: {},
        relationshipTypes: {},
    };
    const siteFilter = C`(@this)-[:FOR_SITE]->(:${Site} {id: ${siteId}})`;

    const entryTypes = await tx.pull(
        EntryType,
        et => et.id.name.contentType.description.friendlyIdPrefix,
        {where: siteFilter},
    );

    entryTypes.forEach(et => {
        result.entryTypes[et.id] = {
            id: et.id,
            name: et.name,
            contentType: CastContentType(et.contentType),
            description: et.description,
            friendlyIdPrefix: et.friendlyIdPrefix,
        };
    });

    const relationshipTypes = await tx.pull(
        RelationshipType,
        rt => rt.id.name.category.description,
        {where: siteFilter},
    );

    relationshipTypes.forEach(rt => {
        result.relationshipTypes[rt.id] = {
            id: rt.id,
            name: rt.name,
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


export function diffSchema(oldSchema: Readonly<SiteSchemaData>, newSchema: Readonly<SiteSchemaData>): EditSet {

    const result: EditSet = {edits: []};

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Entry Types
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
        } })
    }
    // Set properties on existing and new EntryTypes
    for (const entryTypeId of newEntryTypeIds) {
        const oldET: EntryTypeData|undefined = oldSchema.entryTypes[entryTypeId];
        const newET = newSchema.entryTypes[entryTypeId];
        const changes: any = {};
        for (const key of ["name", "description", "friendlyIdPrefix", "contentType"] as const) {
            if (key === "name" && addedEntryTypeIds.has(entryTypeId)) {
                continue;  // Name was already set during the Create step, so skip that property
            }
            if (newET[key] !== oldET?.[key]) {
                changes[key] = newET[key];
            }
        }
        result.edits.push({code: "UpdateEntryType", data: {
            id: entryTypeId,
            ...changes,
        }});
    }

    return result;
}
