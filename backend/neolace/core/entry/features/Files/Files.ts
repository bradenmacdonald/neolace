import { SiteSchemaData, UpdateEntryFilesSchema } from "neolace/deps/neolace-api.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { FilesFeatureEnabled } from "./FilesFeatureEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { FilesData } from "./FilesData.ts";
import { EntryFeatureData } from "../EntryFeatureData.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";
import { Draft, DraftFile } from "neolace/core/edit/Draft.ts";

const featureType = "Files" as const;

/**
 * The "Files" feature allows each entry of the configured EntryType to have one or more attached files, of any type.
 */
export const FilesFeature = EntryTypeFeature({
    featureType,
    configClass: FilesFeatureEnabled,
    dataClass: FilesData,
    updateFeatureSchema: UpdateEntryFilesSchema,
    async contributeToSchema(mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) {
        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${FilesFeatureEnabled})
            WITH et, config
            RETURN et.id AS entryTypeId
        `.givesShape({ entryTypeId: Field.VNID }));

        configuredOnThisSite.forEach((config) => {
            const entryTypeId: VNID = config.entryTypeId;
            if (!(entryTypeId in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeId].enabledFeatures[featureType] = {
                /* No detailed configuration at this time */
            };
        });
    },
    async updateConfiguration(entryTypeId, _config: Record<string, never>, tx, markNodeAsModified) {
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${FilesFeatureEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}
        `.RETURN({ "feature.id": Field.VNID }));

        // We need to mark the FilesFeatureEnabled node as modified:
        markNodeAsModified(result["feature.id"]);
    },
    async editFeature(entryId, editData, tx, markNodeAsModified): Promise<void> {
        // Associate the Entry with the FilesData node
        const result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            // Note that the code that calls this has already verified that this feature is enabled for this entry type.
            MERGE (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(filesData:${FilesData}:${C(EntryFeatureData.label)})
            ON CREATE SET
                filesData.id = ${VNID()}
        `.RETURN({ "filesData.id": Field.VNID }));
        const filesDataId = result["filesData.id"];
        // Associate the ImageData with the DataFile that holds the actual image contents
        if (editData.changeType === "addFile") {
            await tx.query(C`
                MATCH (imageData:${FilesData} {id: ${filesDataId}})
                MATCH (:${Draft})-[:${Draft.rel.HAS_FILE}]->(:${DraftFile} {id: ${editData.draftFileId}})-[:${DraftFile.rel.HAS_DATA}]->(dataFile:${DataFile})
                MERGE (imageData)-[rel:${FilesData.rel.HAS_DATA}]->(dataFile)
                    SET rel.displayFilename = ${editData.filename}
                WITH imageData, dataFile
                MATCH (imageData)-[rel:${FilesData.rel.HAS_DATA}]->(oldFile)
                    WHERE rel.displayFilename = ${editData.filename} AND NOT oldFile = dataFile
                DELETE rel
            `);
        } else if (editData.changeType === "removeFile") {
            await tx.query(C`
                MATCH (imageData:${FilesData} {id: ${filesDataId}})
                MATCH (imageData)-[rel:${FilesData.rel.HAS_DATA}]->(oldFile)
                    WHERE rel.displayFilename = ${editData.filename}
                DELETE rel
            `);
            // Note we don't delete 'oldFile'; in future an occasional cleanup task will delete stranded DataFiles,
            // from both Neo4j and object storage.
        }

        markNodeAsModified(filesDataId);
    },

    /**
     * Load the details of this feature for a single entry.
     */
    async loadData({ data, tx }) {
        if (data === undefined) {
            return undefined;
        }
        const dataFiles = (await tx.pullOne(
            FilesData,
            (fd) => fd.dataFiles((df) => df.displayFilename().publicUrl().contentType.size),
            { key: data.id },
        )).dataFiles;
        return {
            files: dataFiles.map((dataFile) => ({
                filename: dataFile.displayFilename,
                url: dataFile.publicUrl,
                contentType: dataFile.contentType,
                size: Number(dataFile.size),
            })),
        };
    },
});
