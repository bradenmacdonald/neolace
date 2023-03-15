/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { readableStreamFromIterable } from "std/streams/readable_stream_from_iterable.ts";
import { crypto } from "std/crypto/mod.ts";
import { SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";
import { getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { CreateDataFile, DataFile } from "neolace/core/objstore/DataFile.ts";
import { RecordTempFile } from "neolace/core/edit/TempFile-actions.ts";
import { uploadFileToObjStore } from "neolace/core/objstore/objstore.ts";
import { bin2hex } from "neolace/lib/bin2hex.ts";

/**
 * Upload a temporary file, so that it can be used with an entry edit.
 */
export class TempFileResource extends NeolaceHttpResource {
    public paths = ["/site/:siteKey/file"];

    POST = this.method({
        responseSchema: SDK.TempFileSchema,
        description:
            "Upload a temporary file which can then be used an edit. Pass ?sha256Hash=hex to potentially speed up the upload.",
    }, async ({ request }) => {
        // Permissions and parameters:
        const user = this.requireUser(request);
        await this.requirePermission(request, SDK.CorePerm.uploadTempFiles, {});
        const graph = await getGraph();

        // At this point, we know the draft is valid and the user has permission to upload files into it.

        // Doesn't work with Drash yet 😞 - see https://github.com/drashland/drash/issues/604
        //  const contentType = request.headers.get("Content-Type");
        //  const bodyStream = request.body;
        // So do this instead:
        const formFile = request.bodyParam<{ content: Uint8Array; type: string; size: number }>("file");
        if (!formFile) {
            throw new SDK.InvalidRequest(
                SDK.InvalidRequestReason.OtherReason,
                "Expected a form-encoded uploaded file called 'file'.",
            );
        }
        const contentType = formFile.type;
        const bodyStream = readableStreamFromIterable([formFile.content]);

        if (contentType === null || bodyStream === null) {
            throw new SDK.InvalidRequest(
                SDK.InvalidRequestReason.OtherReason,
                "Missing body data or content-type header.",
            );
        }

        let dataFileId: VNID;

        const hashProvided = request.queryParam("sha256Hash");
        if (hashProvided) {
            // The user has told us the SHA-256 hash of the file data to be uploaded. We can use this to check if we
            // already have the same file data uploaded somewhere (most likely to happen during development or repeat
            // export-edit-import cycles).
            // However, we must never allow a user to link an existing private file to a draft by knowing only its
            // sha256Hash, because it's possible that the user could know the hash but not the contents of a private
            // file on the site or even on another site in the realm.
            const existingDataFiles = await graph.read((tx) =>
                tx.pull(DataFile, (df) => df.id, { with: { sha256Hash: hashProvided } })
            );
            if (existingDataFiles.length) {
                // A file with the same hash has already been uploaded.
                if (user.id === SYSTEM_VNID) {
                    // The system user can see/do everything, so just use the existing uploaded DataFile
                    dataFileId = existingDataFiles[0].id;
                } else {
                    // We won't re-upload this file to object storage, but we will double-check that the user actually
                    // knows the contents of the file, to avoid exposing an existing private file to a user who only
                    // knows its SHA-256 hash.
                    const actualHashBin = await crypto.subtle.digest("SHA-256", bodyStream);
                    const sha256Hash = bin2hex(new Uint8Array(actualHashBin));
                    if (hashProvided !== sha256Hash) {
                        throw new SDK.InvalidRequest(
                            SDK.InvalidRequestReason.OtherReason,
                            `The sha256Hash provided did not match the data. Calculated hash was "${sha256Hash}"`,
                        );
                    }
                    dataFileId = existingDataFiles[0].id;
                }
            } else {
                // There is no existing file with this sha256hash
                const uploadData = await uploadFileToObjStore(bodyStream, { contentType });
                if (hashProvided !== uploadData.sha256Hash) {
                    throw new SDK.InvalidRequest(
                        SDK.InvalidRequestReason.OtherReason,
                        `The sha256Hash provided did not match the data. Calculated hash was "${uploadData.sha256Hash}"`,
                    );
                }
                await graph.runAs(user.id, CreateDataFile({ ...uploadData, contentType }));
                dataFileId = uploadData.id;
            }
        } else {
            // No hash was provided. Just upload the file.
            const uploadData = await uploadFileToObjStore(bodyStream, { contentType });
            await graph.runAs(user.id, CreateDataFile({ ...uploadData, contentType }));
            dataFileId = uploadData.id;
        }

        const result = await graph.runAs(user.id, RecordTempFile({ userId: user.id, dataFileId }));

        // Response:
        return {
            tempFileId: result.tempFileId,
        };
    });
}
