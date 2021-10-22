import { S3Client, PutObjectCommand } from "neolace/deps/s3.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { Buffer } from "std/io/buffer.ts";
import { iterateReader } from "std/streams/conversion.ts";

import { config } from "neolace/app/config.ts";
import { FileMetadata, detectImageMetadata } from "neolace/core/objstore/detect-metadata.ts";

const bin2hex = (binary: Uint8Array) => Array.from(binary).map(b => b.toString(16).padStart(2, '0')).join('');


const objStoreClient = new S3Client({
    // We can't just specify a URL at the moment due to https://github.com/christophgysin/aws-sdk-js-v3/issues/24
    //endpoint: config.objStoreEndpointURL,
    endpoint: (() => {
        const endpointParsed = new URL(config.objStoreEndpointURL);
        return {
            protocol: endpointParsed.protocol.slice(0,-1),
            // Ensure that if we're connecting to a local endpoint with a port number, the port number is included in the header.
            hostname: endpointParsed.hostname + (endpointParsed.port ? `:${endpointParsed.port}` : ''),
            path: '/',
        };
    })(),
    region: config.objStoreRegion,
    credentials: {
        accessKeyId: config.objStoreAccessKey,
        secretAccessKey: config.objStoreSecretKey,
    },
    bucketEndpoint: false,
    forcePathStyle: true,  // Fix: "TypeError: error sending request for url (http://neolace-test-objects.localhost:9000/"
});


// These exports shouldn't be used elsewhere in the app, other than admin scripts like dev-data
export const __forScriptsOnly = { objStoreClient, bucket: config.objStoreBucketName };


export async function uploadFileToObjStore(fileStream: Deno.Reader, options: {contentType: string, id?: VNID}): Promise<{
    id: VNID,
    filename: string,
    sha256Hash: string,
    size: number,
    metadata: FileMetadata,
}> {
    let metadata: FileMetadata = {};
    const id = options.id ?? VNID();
    // Add a second VNID to the filename so that the ID alone is not enough to download the file (security concern)
    const filename = `${id}${VNID()}`;
    // Stream the file to object storage, calculating its SHA-256 hash as we go
    let sizeCalculator = 0;

    // TODO: this needs to be re-written to not use a buffer once we can upload via streams to S3

    const buf = new Buffer();
    for await (const chunk of iterateReader(fileStream)) {
        // TODO in future: Update the hash as we stream the contents into buffer
        // Note: can use import { crypto } from "std/crypto/mod.ts"; to get a version of this that supports streaming a digest from an async iterator.
        sizeCalculator += chunk.length;
        buf.write(chunk);
    }
    const bufferData = buf.bytes();

    if (options.contentType.startsWith("image/") && options.contentType !== "image/svg+xml") {
        metadata = await detectImageMetadata(bufferData)
    }

    // TODO: verify content type is correct - if it's binary, use magic numbers (see 'file-type' on NPM though it has
    // dependencies); if it's text, do our own test (see https://github.com/BaseMax/detect-svg/blob/master/index.js)

    // Upload the file to the object store, using tempFilename:
    try {
        const command = new PutObjectCommand({
            Bucket: config.objStoreBucketName,
            Key: filename,
            Body: bufferData,
            ContentType: options.contentType,
            CacheControl: "public, max-age=604800, immutable",
        });
        await objStoreClient.send(command);
    } catch (err) {
        // may need some code here to log the detailed error from the XML response?
        throw err;
    }

    // Now we know the file's hash and size:
    const sha256Hash = bin2hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bufferData)));
    const size = sizeCalculator;

    return {
        id,
        filename,
        sha256Hash,
        size,
        metadata,
    };
}
