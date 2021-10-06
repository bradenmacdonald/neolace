import { S3Bucket } from "neolace/deps/s3.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { createHash } from "std/hash/mod.ts";
import { Buffer, iter } from "std/io/mod.ts";

import { config } from "neolace/app/config.ts";

const objStoreClient = new S3Bucket({
    bucket: config.objStoreBucketName,
    endpointURL: config.objStoreEndpointURL,
    accessKeyID: config.objStoreAccessKey,
    secretKey: config.objStoreSecretKey,
    region: config.objStoreRegion,
});

// These exports shouldn't be used elsewhere in the app, other than admin scripts like dev-data
export const __forScriptsOnly = { objStoreClient };


// TODO: set up MinIO to automatically delete uploaded temp files if any are stranded
// https://docs.minio.io/docs/minio-bucket-lifecycle-guide.html


export async function uploadFileToObjStore(fileStream: Deno.Reader, contentType: string): Promise<{sha256Hash: string, size: number}> {
    // First we upload to a temporary filename
    const tempFilename = `temp/${VNID()}`;
    // Stream the file to object storage, calculating its SHA-256 hash as we go
    const hasher = createHash("sha256");
    let sizeCalculator = 0;

    // TODO: this needs to be re-written to not use a buffer once we can upload via streams to S3

    const buf = new Buffer();
    for await (const chunk of iter(fileStream)) {
        // Update the hash as we stream the contents into buffer
        sizeCalculator += chunk.length;
        hasher.update(chunk);
        buf.write(chunk);
    }

    // TODO: verify content type is correct - if it's binary, use magic numbers (see 'file-type' on NPM though it has
    // dependencies); if it's text, do our own test (see https://github.com/BaseMax/detect-svg/blob/master/index.js)

    // Upload the file to the object store, using tempFilename:
    await objStoreClient.putObject(tempFilename, buf.bytes(), {
        contentType,
        // Since we store files at a URL based on their hash, they can and should be cached as aggressively as possible:
        cacheControl: "public, max-age=604800, immutable",
    });

    // Now we know the file's hash and size:
    const sha256Hash = hasher.toString("hex");
    const size = sizeCalculator;
    // Check if an asset with that same hash already exists, and if not, copy this from the temp file into that place.
    const stat = await objStoreClient.headObject(sha256Hash);
    if (stat) {
        // Do nothing; an identical file already exists in the asset library.
        console.error(`File exists, metadata is ${JSON.stringify(stat.meta)}`);
        // TODO: verify that content-type is correct.

        if (stat.contentLength !== size) {
            throw new Error(`Existing file with the same hash had size ${stat.contentLength} but this had size ${size}`);
        }
    } else {
        // This is a new file; no file with the same hash value already exists.
        // Copy from tempFilename to sha256Hash filename
        objStoreClient.copyObject(tempFilename, sha256Hash, {});
    }
    // delete the temporary file
    await objStoreClient.deleteObject(tempFilename);

    return {
        sha256Hash,
        size,
    };
}
