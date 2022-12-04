import { AnyEdit, consolidateEdits, DraftStatus, EditList, getEditType } from "neolace/deps/neolace-api.ts";
import { C, defaultUpdateFor, defineAction, Field, VNID } from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Draft, DraftEdit } from "./Draft.ts";
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
    resultData: {} as { id: VNID; num: number },
    apply: async (tx, data) => {
        const id = data.id ?? VNID();

        const result = await tx.queryOne(C`
            // Match site and author:
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (author:${User} {id: ${data.authorId}})

            // Generate a site-specific number for this draft:
            MERGE (uid:UniqueId {name: "draft-" + site.id})
            ON CREATE SET uid.lastId = 1
            ON MATCH SET uid.lastId = uid.lastId + 1
            WITH site, author, uid.lastId AS num

            // Create the draft:
            CREATE (draft:${Draft}:${C(EditSource.label)} {id: ${id}})
            SET draft.siteNamespace = site.id
            SET draft.num = num
            SET draft.title = ${data.title}
            SET draft.description = ${data.description ?? ""}
            SET draft.status = ${DraftStatus.Open}
            SET draft.created = datetime()
            CREATE (draft)-[:${Draft.rel.FOR_SITE}]->(site)
            CREATE (draft)-[:${Draft.rel.AUTHORED_BY}]->(author)
        `.RETURN({ num: Field.Int }));

        const otherModifiedNodes: VNID[] = [];
        if (data.edits.length > 0) {
            const { modifiedNodes } = await UpdateDraft.apply(tx, { id, addEdits: data.edits });
            otherModifiedNodes.push(...modifiedNodes);
        }

        return {
            resultData: { id, num: result.num },
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
            id: data.id,
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
