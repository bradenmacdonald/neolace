/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as check from "neolace/deps/computed-types.ts";
import { C, defineAction, DerivedProperty, Field, RawVNode, VNID, VNodeType } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { FileMetadata, FileMetadataSchema } from "./detect-metadata.ts";
import { getSignedDownloadUrl } from "./objstore.ts";

/**
 * A data file uploaded to Neolace, such as an image, PDF, CSV file, etc.
 * This is a very low-level node type; it should be linked to (owned by) one or more other types like ImageData,
 * Site, etc. that contain more information about who owns it and how it is being used.
 *
 * This type is generally immutable and shouldn't change once created (unless the metadata or contentType needs to be
 * updated?)
 *
 * Files may be de-duplicated at the storage level using their sha256hash, but it's always necessary to know the
 * DataFile ID to read an object - we don't allow retrieving a DataFile by its hash, which could be a security risk. So
 * the sha256hash is not necssarily unique.
 */
export class DataFile extends VNodeType {
    static label = "DataFile";
    static readonly properties = {
        ...VNodeType.properties,
        /** Filename of this file on object storage. This won't include a file extension. */
        filename: Field.String,
        /** SHA-256 hash (in hex) of this data file */
        sha256Hash: Field.String.Check(check.string.min(64).max(64).toLowerCase()),
        /** Size in bytes */
        size: Field.Int.Check(check.number.integer().min(1)),
        /** IANA media type for this file */
        contentType: Field.String.Check(check.string.toLowerCase()),
        /**
         * Metadata, which depends on the file type.
         * Any data in this field must be something that can be derived purely from the file contents; in other words,
         * this is data about what the file is, not about how it is being used.
         */
        metadata: Field.NullOr.JsonObjString,
    };

    static derivedProperties = this.hasDerivedProperties({
        publicUrl,
    });

    static async validate(dbObject: RawVNode<typeof this>): Promise<void> {
        if (dbObject.metadata) {
            FileMetadataSchema(dbObject.metadata); // Validate the metadata against the schema
        }
    }
}

//export const CreateDataFile = defaultCreateFor(DataFile, d => d.sha256Hash.size.contentType);
// Default Create doesn't allow specifying the ID, which we need, so we implement the create action ourselves:
export const CreateDataFile = defineAction({
    type: `CreateDataFile` as const,
    parameters: {} as {
        id: VNID;
        filename: string;
        sha256Hash: string;
        size: number;
        contentType: string;
        metadata: FileMetadata;
    },
    resultData: {},
    apply: async function applyCreateAction(tx, data) {
        await tx.queryOne(C`
            CREATE (df:${DataFile} {id: ${data.id}})
            SET df += ${{
            filename: data.filename,
            sha256Hash: data.sha256Hash,
            contentType: data.contentType,
            size: BigInt(data.size),
            metadata: JSON.stringify(data.metadata),
        }}
        `.RETURN({}));
        const description = `Created ${DataFile.withId(data.id)}`;
        return {
            resultData: {},
            modifiedNodes: [data.id],
            description,
        };
    },
});

/**
 * Get the full public path to view/download this image
 */
export function publicUrl(): DerivedProperty<string> {
    return DerivedProperty.make(
        DataFile,
        (df) => df.filename.contentType,
        (data) => {
            if (config.objStorePublicUrlPrefixForImages && data.contentType.startsWith("image/")) {
                return `${config.objStorePublicUrlPrefixForImages}/${data.filename}`;
            }
            return `${config.objStorePublicUrlPrefix}/${data.filename}`; // This doesn't use publicUrlForDataFile below because this is synchronous.
        },
    );
}

/**
 * Get the public URL to download a file from object storage.
 * @param filename The underlying filename of the DataFile object
 * @param displayFilename The friendly filename that users should see if they save the file
 */
export async function publicUrlForDataFile(filename: string, displayFilename?: string): Promise<string> {
    if (!displayFilename) {
        return `${config.objStorePublicUrlPrefix}/${filename}`;
    } else {
        return getSignedDownloadUrl(filename, displayFilename);
    }
}
