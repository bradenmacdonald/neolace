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
