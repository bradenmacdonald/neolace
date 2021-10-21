import * as log from "std/log/mod.ts";
import { S3Client, PutObjectCommand } from "neolace/deps/s3.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { createHash } from "std/hash/mod.ts";
import { Buffer, iter } from "std/io/mod.ts";

import { config } from "neolace/app/config.ts";


const objStoreClient = new S3Client({
    endpoint: config.objStoreEndpointURL,
    region: config.objStoreRegion,
    credentials: {
        accessKeyId: config.objStoreAccessKey,
        secretAccessKey: config.objStoreSecretKey,
    },
    bucketEndpoint: false,
});


// These exports shouldn't be used elsewhere in the app, other than admin scripts like dev-data
export const __forScriptsOnly = { objStoreClient };


export async function uploadFileToObjStore(fileStream: Deno.Reader, options: {contentType: string, id?: VNID}): Promise<{id: VNID, filename: string, sha256Hash: string, size: number}> {
    const id = options.id ?? VNID();
    // Add a second VNID to the filename so that the ID alone is not enough to download the file (security concern)
    const filename = `${id}${VNID()}`;
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
    try {
        const command = new PutObjectCommand({
            Bucket: config.objStoreBucketName,
            Key: filename,
            Body: buf.bytes(),
            ContentType: options.contentType,
            CacheControl: "public, max-age=604800, immutable",
        });
        await objStoreClient.send(command);
    } catch (err) {
        // may need some code here to log the detailed error from the XML response?
        throw err;
    }

    // Now we know the file's hash and size:
    const sha256Hash = hasher.toString("hex");
    const size = sizeCalculator;

    return {
        id,
        filename,
        sha256Hash,
        size,
    };
}
