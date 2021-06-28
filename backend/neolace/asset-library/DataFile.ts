import * as check from "neolace/deps/computed-types.ts";
import {
    VNodeType,
    defaultCreateFor,
    Field,
} from "neolace/deps/vertex-framework.ts";

/**
 * A data file uploaded to TechNotes, such as an image, PDF, CSV file, etc.
 * This is a very low-level node type; it should always be linked to a node like "Image" that contains
 * more metadata and license information etc.
 * This type is generally immutable and shouldn't change once created (unless the content-type was wrong?)
 */
@VNodeType.declare
export class DataFile extends VNodeType {
    static label = "DataFile";
    static readonly properties = {
        ...VNodeType.properties,
        /** SHA-256 hash (in hex) of this data file */
        sha256Hash: Field.String.Check(check.string.min(64).max(64).toLowerCase()),
        /** Size in bytes */
        size: Field.Int.Check(check.number.integer().min(1)),
        /** IANA media type for this file */
        contentType: Field.String.Check(check.string.toLowerCase()),
    };
    //validate: async (node, tx) => {
        // TODO: validate content type
    //}
}

export const CreateDataFile = defaultCreateFor(DataFile, d => d.sha256Hash.size.contentType);
