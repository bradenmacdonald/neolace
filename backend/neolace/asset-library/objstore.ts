// Use "minio" client to connect
import crypto from "crypto";
import { Readable, Transform } from "stream";
import * as Minio from "minio";
import { VNID } from "neolace/deps/vertex-framework.ts";

import { config } from "../app/config.ts";

// Backblaze B2 is not perfectly compatible with the S3 API, and in particular will
// give an error when the MinIO client tries to auto-detect the "region", so if using
// Backblaze for object storage, the region must be specified explicitly.
const region = config.objStoreEndpoint.match(/s3\.([\w-]+).backblazeb2\.com/)?.[1];

const objStoreClient = new Minio.Client({
    endPoint: config.objStoreEndpoint,
    port: config.objStorePort,
    useSSL: config.objStoreUseSSL,
    accessKey: config.objStoreAccessKey,
    secretKey: config.objStoreSecretKey,
    region,
});

// These exports shouldn't be used elsewhere in the app, other than admin scripts like dev-data
export const __forScriptsOnly = { objStoreClient };


// TODO: set up MinIO to automatically delete uploaded temp files if any are stranded
// https://docs.minio.io/docs/minio-bucket-lifecycle-guide.html


export async function uploadFileToObjStore(fileStream: Readable, contentType: string): Promise<{sha256Hash: string, size: number}> {
    // First we upload to a temporary filename
    const tempFilename = `temp/${VNID()}`;
    // Stream the file to object storage, calculating its SHA-256 hash as we go
    const hasher = crypto.createHash("sha256");
    let sizeCalculator = 0;

    /**
     * Transform stream that passes data through while computing the hash and size of the data.
     */
    const hashTransform = new Transform({
        transform(chunk, encoding, callback) {
            sizeCalculator += chunk.length;
            hasher.update(chunk);
            callback(null, chunk);
        }
    });

    const hashedStream = fileStream.pipe(hashTransform);
    // Perhaps we should verify content type using 'file-type'? const fileTypeStream = await FileType.stream(hashedStream);
    // Downside is it can't detect SVG or CSV which are very important for TechNotes.
    // It also has several dependencies, so just copy core.js into here?

    // Upload the file to the object store, using tempFilename:
    const metadata = {
        "Content-Type": contentType,
        // Since we store files at a URL based on their hash, they can and should be cached as aggressively as possible:
        "Cache-Control": "public, max-age=604800, immutable",
    };
    await objStoreClient.putObject(config.objStoreBucketName, tempFilename, hashedStream, metadata);

    // Now we know the file's hash and size:
    const sha256Hash = hasher.digest("hex");
    const size = sizeCalculator;
    // Check if an asset with that same hash already exists, and if not, copy this from the temp file into that place.
    await objStoreClient.statObject(config.objStoreBucketName, sha256Hash).then(data => {
        // Do nothing; an identical file already exists in the asset library.
        console.error(`File exists, metadata is ${JSON.stringify(data.metaData)}`);

        // TODO: verify that content-type is correct.

        if (data.size !== size) {
            throw new Error(`Existing file with the same hash had size ${data.size} but this had size ${size}`);
        }
    }, (err: unknown) => {
        if (err instanceof Error && (err as any).code === "NotFound") {
            // This is a new file; no file with the same hash value already exists.
            // Copy from tempFilename to sha256Hash filename
            const conds = new Minio.CopyConditions();
            return objStoreClient.copyObject(config.objStoreBucketName, sha256Hash, `${config.objStoreBucketName}/${tempFilename}`, conds);
        } else {
            throw err;
        }
    });
    // delete the temporary file
    await objStoreClient.removeObject(config.objStoreBucketName, tempFilename);

    return {
        sha256Hash,
        size,
    };
}
