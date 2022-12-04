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
