/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";
import { TempFile } from "./TempFile.ts";
import { User } from "../mod.ts";

/**
 * Create the TempFile node needed to keep track of a file that has been newly uploaded.
 */
export const RecordTempFile = defineAction({
    type: "RecordTempFile",
    parameters: {} as {
        dataFileId: VNID;
        userId: VNID;
    },
    resultData: {} as { tempFileId: VNID },
    apply: async (tx, data) => {
        const tempFileId = VNID();

        await tx.queryOne(C`
            MATCH (dataFile:${DataFile} {id: ${data.dataFileId}})
            MATCH (user:${User} {id: ${data.userId}})
            CREATE (tempFile:${TempFile} {id: ${tempFileId}})
            CREATE (tempFile)-[:${TempFile.rel.UPLOADED_BY}]->(user)
            CREATE (tempFile)-[:${TempFile.rel.HAS_DATA}]->(dataFile)
            SET tempFile.timestamp = datetime.realtime()
        `.RETURN({ "tempFile.id": Field.VNID }));

        return {
            resultData: { tempFileId },
            modifiedNodes: [tempFileId],
            description: `Uploaded a new temporary file.`,
        };
    },
});
