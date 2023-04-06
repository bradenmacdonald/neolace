/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { S3Client } from "neolace/deps/s3.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";
import { Buffer } from "std/io/buffer.ts";
import { readableStreamFromReader } from "std/streams/readable_stream_from_reader.ts";
import { crypto } from "std/crypto/mod.ts";

import { config } from "neolace/app/config.ts";
import { detectImageMetadata, FileMetadata } from "neolace/core/objstore/detect-metadata.ts";
import { bin2hex } from "neolace/lib/bin2hex.ts";

const endpointParsed = new URL(config.objStoreEndpointURL);
const objStoreClient = new S3Client({
    // We can't just specify a URL at the moment due to https://github.com/christophgysin/aws-sdk-js-v3/issues/24
    //endpoint: config.objStoreEndpointURL,
    endPoint: endpointParsed.hostname,
    port: endpointParsed.port ? Number(endpointParsed.port) : undefined,
    bucket: config.objStoreBucketName,
    region: config.objStoreRegion,
    accessKey: config.objStoreAccessKey,
    secretKey: config.objStoreSecretKey,
    useSSL: endpointParsed.protocol === "https:",
    pathStyle: true,
});

// These exports shouldn't be used elsewhere in the app, other than admin scripts like dev-data
export const __forScriptsOnly = { objStoreClient, bucket: config.objStoreBucketName };

export async function uploadFileToObjStore(
    fileStream: ReadableStream<Uint8Array> | Deno.Reader,
    options: { contentType: string; id?: VNID },
): Promise<{
    id: VNID;
    filename: string;
    sha256Hash: string;
    size: number;
    metadata: FileMetadata;
}> {
    let metadata: FileMetadata = {};
    const id = options.id ?? VNID();
    // Add a second VNID to the filename so that the ID alone is not enough to download the file (security concern)
    const filename = `${id}${VNID()}`;
    // Stream the file to object storage, calculating its SHA-256 hash as we go
    let sizeCalculator = 0;
    const buf = new Buffer(); // If the file is small enough, store it in memory so we can calculate metadata
    const bufSizeLimit = 24 * 1024 * 1024; // Only store the first 24MB in memory

    const fileStreamReader = fileStream instanceof ReadableStream
        ? fileStream
        : readableStreamFromReader(fileStream, { autoClose: false });
    // Split ("tee") the file stream into two separate streams:
    // ourStream, which we use to hash the contents and analyze the file type, image dimensions, etc.
    // uploadStream, which uploads the file to the object storage endpoint (e.g. MinIO, S3)
    const [ourStream, uploadStream] = fileStreamReader.tee();
    async function* readAndSizeStream(stream: ReadableStream) {
        const reader = stream.getReader();
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) {
                // Done.
                return;
            } else if (chunk.value) {
                sizeCalculator += chunk.value.length;
                // Store the first part of the file in memory, so we can analyze it for metadata.
                if (sizeCalculator < bufSizeLimit) {
                    buf.write(chunk.value);
                }
                yield chunk.value;
            }
        }
    }
    const hashPromise = crypto.subtle.digest("SHA-256", readAndSizeStream(ourStream));

    // TODO: verify content type is correct - if it's binary, use magic numbers (see 'file-type' on NPM though it has
    // dependencies); if it's text, do our own test (see https://github.com/BaseMax/detect-svg/blob/master/index.js)

    // Upload the file to the object store:
    await objStoreClient.putObject(filename, uploadStream, {
        metadata: {
            "Cache-Control": "public, max-age=604800, immutable",
            "Content-Type": options.contentType,
        },
    });

    // Now, once we await "hashPromise", we'll know the file's hash and size.
    const sha256Hash = bin2hex(new Uint8Array(await hashPromise));
    const size = sizeCalculator;

    if (options.contentType.startsWith("image/") && options.contentType !== "image/svg+xml" && size < bufSizeLimit) {
        metadata = await detectImageMetadata(buf.bytes());
    }

    return {
        id,
        filename,
        sha256Hash,
        size,
        metadata,
    };
}
