import { SiteSchemaData, UpdateEntryImageSchema } from "neolace/deps/neolace-api.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { ImageFeatureEnabled } from "./ImageFeatureEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { ImageData } from "./ImageData.ts";
import { EntryFeatureData } from "../EntryFeatureData.ts";

const featureType = "Image" as const;

/**
 * The "Image" feature allows each entry of the configured EntryType to "hold" an image. In other words, entries of that
 * type each represent an image. Usually this is used instead of the "Article" feature, but both can be used together.
 */
export const ImageFeature = EntryTypeFeature({
    featureType,
    configClass: ImageFeatureEnabled,
    updateFeatureSchema: UpdateEntryImageSchema,
    async contributeToSchema(mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) {

        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${ImageFeatureEnabled})
            WITH et, config
            RETURN et.id AS entryTypeId
        `.givesShape({entryTypeId: Field.VNID}));

        configuredOnThisSite.forEach(config => {
            const entryTypeId: VNID = config.entryTypeId;
            if (!(entryTypeId in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeId].enabledFeatures[featureType] = {
                /* No detailed configuration at this time */
            };
        });
    },
    async updateConfiguration(entryTypeId: VNID, _config: Record<string, never>, tx: WrappedTransaction, markNodeAsModified: (vnid: VNID) => void) {
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${ImageFeatureEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}
        `.RETURN({"feature.id": Field.VNID}));

        // We need to mark the ImageFeatureEnabled node as modified:
        markNodeAsModified(result["feature.id"]);
    },
    async editFeature(entryId, editData, tx, markNodeAsModified): Promise<void> {
        const changes: Record<string, unknown> = {};
        if (editData.sha256Hash !== undefined) {
            changes.sha256Hash = editData.sha256Hash;
        }

        const result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            // Note that the code that calls this has already verified that this feature is enabled for this entry type.
            MERGE (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(imageData:${ImageData}:${C(EntryFeatureData.label)})
            ON CREATE SET
                imageData.id = ${VNID()},
            SET imageData += ${changes}
        `.RETURN({"imageData.id": Field.VNID}));

        markNodeAsModified(result["imageData.id"]);
    },
});
