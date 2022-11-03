import { AnyEdit, consolidateEdits, DraftStatus, EditList, getEditType } from "neolace/deps/neolace-api.ts";
import { C, defaultUpdateFor, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";
import { Draft, DraftEdit, DraftFile } from "./Draft.ts";
import { EditSource } from "./EditSource.ts";

export const UpdateDraft = defaultUpdateFor(Draft, (d) => d.title.description, {
    otherUpdates: async (
        args: {
            addEdits?: EditList;
        },
        tx,
        nodeSnapshot,
    ) => {
        const additionalModifiedNodes: VNID[] = [];

        if (args.addEdits?.length) {
            // Add edits to this draft:

            const editsExpanded = args.addEdits.map((e) => ({
                id: VNID(),
                code: e.code,
                dataJson: JSON.stringify(e.data),
                changeType: getEditType(e.code).changeType,
            }));

            await tx.query(C`
                MATCH (draft:${Draft} {id: ${nodeSnapshot.id}})
                UNWIND ${editsExpanded} AS editData
                CREATE (edit:${DraftEdit} {id: editData.id})
                CREATE (draft)-[:${Draft.rel.HAS_EDIT}]->(edit)
                SET edit.code = editData.code
                SET edit.data = editData.dataJson
                SET edit.changeType = editData.changeType
                SET edit.timestamp = datetime.realtime()
            `);

            additionalModifiedNodes.push(...editsExpanded.map((e) => e.id));
        }

        return { additionalModifiedNodes };
    },
});

/**
 * Add a file to a draft
 */
export const AddFileToDraft = defineAction({
    type: "AddFileToDraft",
    parameters: {} as {
        draftId: VNID;
        dataFileId: VNID;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const id = VNID();

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
        `.RETURN({}));

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
            MATCH (dataFile:${DataFile} {id: ${data.dataFileId}})
        `.RETURN({}));

        const result = await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
            MATCH (dataFile:${DataFile} {id: ${data.dataFileId}})
            MERGE (draft)-[:${Draft.rel.HAS_FILE}]->(draftFile:${DraftFile})-[:${DraftFile.rel.HAS_DATA}]->(dataFile)
                ON CREATE SET draftFile.timestamp = datetime.realtime(), draftFile.id = ${id}
        `.RETURN({ "draftFile.id": Field.VNID }));

        return {
            resultData: { id: result["draftFile.id"] },
            modifiedNodes: [data.draftId, result["draftFile.id"]],
            description: `Added file to ${Draft.withId(id)}`,
        };
    },
});

/**
 * Create a draft
 */
export const CreateDraft = defineAction({
    type: "CreateDraft",
    parameters: {} as {
        id?: VNID;
        siteId: VNID;
        authorId: VNID;
        edits: EditList;
        title: string;
        description?: string;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const id = data.id ?? VNID();

        await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (author:${User} {id: ${data.authorId}})
            CREATE (draft:${Draft}:${C(EditSource.label)} {id: ${id}})
            SET draft.title = ${data.title}
            SET draft.description = ${data.description ?? ""}
            SET draft.status = ${DraftStatus.Open}
            SET draft.created = datetime()
            CREATE (draft)-[:${Draft.rel.FOR_SITE}]->(site)
            CREATE (draft)-[:${Draft.rel.AUTHORED_BY}]->(author)
        `.RETURN({}));

        const otherModifiedNodes: VNID[] = [];
        if (data.edits.length > 0) {
            const { modifiedNodes } = await UpdateDraft.apply(tx, { key: id, addEdits: data.edits });
            otherModifiedNodes.push(...modifiedNodes);
        }

        return {
            resultData: { id },
            modifiedNodes: [id, ...otherModifiedNodes],
            description: `Created ${Draft.withId(id)}`,
        };
    },
});

/**
 * Accept a draft, applying its changes
 */
export const AcceptDraft = defineAction({
    type: "AcceptDraft",
    parameters: {} as {
        id: VNID;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const draft = await tx.pullOne(Draft, (d) => d.status.site((s) => s.id).edits((e) => e.code.data), {
            key: data.id,
        });
        if (draft.status !== DraftStatus.Open) {
            throw new Error("Draft is not open.");
        }

        // Consolidate the edits so that we don't do something like create an entry and then immediately delete it.
        const editsConsolidated = consolidateEdits(draft.edits as AnyEdit[]);

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.id}})
            SET draft.status = ${DraftStatus.Accepted}
        `.RETURN({}));

        const { modifiedNodes } = await ApplyEdits.apply(tx, {
            siteId: draft.site!.id,
            editSource: data.id,
            edits: editsConsolidated,
        });

        return {
            resultData: { id: data.id },
            modifiedNodes: [data.id, ...modifiedNodes],
            description: `Accepted ${Draft.withId(data.id)}`,
        };
    },
});
