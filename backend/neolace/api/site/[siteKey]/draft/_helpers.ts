import { api, getGraph, NeolaceHttpRequest } from "neolace/api/mod.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { ActionObject, ActionSubject } from "neolace/core/permissions/action.ts";
import { checkPermissionsForAll } from "neolace/core/permissions/check.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

/** Get a draft's unique VNID from the idNum path parameter in the current request */
export async function getDraftIdFromRequest(request: NeolaceHttpRequest, siteId: VNID) {
    const draftIdNumStr = request.pathParam("draftIdNum") ?? "";
    const idNum = parseInt(draftIdNumStr);
    if (idNum <= 0 || isNaN(idNum)) {
        throw new api.InvalidFieldValue([{
            fieldPath: "draftIdNum",
            message: `Expected an integer draft idNum (got: ${draftIdNumStr})`,
        }]);
    }
    return await getDraftId(idNum, siteId);
}

/** Get a draft's unique VNID from its site-specific idNum */
export async function getDraftId(idNum: number, siteId: VNID): Promise<VNID> {
    const graph = await getGraph();
    const data = await graph.read((tx) => tx.pullOne(Draft, (d) => d.id, { with: { siteNamespace: siteId, idNum } }));
    return data.id;
}

/**
 * A helper function to get a draft
 */
export async function getDraft(
    draftId: VNID,
    tx: WrappedTransaction,
    flags: Set<api.GetDraftFlags> = new Set(),
): Promise<api.DraftData> {
    const draftData = await tx.pullOne(Draft, (d) =>
        d
            .idNum
            .title
            .description
            .author((a) => a.username.fullName)
            .created
            .status
            .if("edits", (d) => d.edits((e) => e.id.code.changeType.timestamp.data)), {
        key: draftId,
        flags: Array.from(flags),
    });

    const author = draftData.author;
    if (author === null) {
        throw new Error(`Internal error, author shouldn't be null on Draft ${draftId}.`);
    }

    // TODO: fix this so we can just "return draftData"; currently it doesn't work because the "author" virtual prop is sometimes nullable
    return {
        idNum: draftData.idNum,
        author,
        created: draftData.created,
        title: draftData.title,
        description: draftData.description,
        status: draftData.status,
        edits: draftData.edits as
            | (api.AnyEdit & { id: VNID; changeType: api.EditChangeType; timestamp: Date })[]
            | undefined,
    };
}

export async function checkPermissionsRequiredForEdits(
    edits: api.EditList,
    subject: ActionSubject,
    mode: "propose" | "apply",
    /**
     * Edits that are already in the draft; we don't check their permissions but we may need them to determine entry
     * types on subsequent edits that we are checking.
     */
    previousEdits?: api.EditList,
) {
    if (subject.userId === undefined) {
        throw new api.NotAuthenticated();
    }

    let hasSchemaChanges = false;
    /** Keys are the new entryIDs, values are the new entry type's key */
    const hasNewEntriesOfTypes = new Map<VNID, string>();
    const hasChangesToEntries = new Set<VNID>();

    if (previousEdits) {
        for (const e of previousEdits) {
            if (e.code === "CreateEntry") {
                hasNewEntriesOfTypes.set(e.data.entryId, e.data.entryTypeKey); // add an entry to the map, associating the entry ID with the entryTypeId
            }
        }
    }

    for (const e of edits) {
        const editType = api.getEditType(e.code);
        if (editType.changeType === api.EditChangeType.Schema) {
            hasSchemaChanges = true;
        } else if (editType.changeType === api.EditChangeType.Content) {
            const entryEdit = e as api.AnyContentEdit; // Tell TypeScript that this is definitely a content edit now
            if (entryEdit.code === "CreateEntry") {
                hasNewEntriesOfTypes.set(entryEdit.data.entryId, entryEdit.data.entryTypeKey); // add an entry to the map, associating the entry ID with the entryTypeId
            } else {
                hasChangesToEntries.add(entryEdit.data.entryId);
            }
        }
    }

    const requirePermission = async (perm: api.PermissionName, objects: ActionObject[]) => {
        const results = await checkPermissionsForAll(subject, perm, objects);
        if (results.length !== objects.length) throw new Error(`Internal error in permissions check`);
        if (!results.every((r) => r === true)) {
            throw new api.NotAuthorized("You do not have sufficient permissions.");
        }
    };

    // If there are any newly created entries, make sure the user has permission to create entries of that type:
    if (hasNewEntriesOfTypes) {
        const objects = Array.from(hasNewEntriesOfTypes.entries()).map(([entryId, entryTypeKey]) => ({
            entryId,
            entryTypeKey,
        }));
        const permNeeded = mode === "propose" ? api.CorePerm.proposeNewEntry : api.CorePerm.applyEditsToEntries;
        await requirePermission(permNeeded, objects);
    }
    // If there are any modified entries, make sure the user has permission to edit those entries:
    if (hasChangesToEntries) {
        const graph = await getGraph();

        const objects: ActionObject[] = [];

        for (const entryId of hasChangesToEntries.values()) {
            // Get the entry type, either from the edits (if it's a new entry) or from the graph:
            const entryTypeKey = hasNewEntriesOfTypes.get(entryId) ??
                (await graph.pullOne(Entry, (e) => e.id.type((t) => t.key), { id: entryId })).type!.key;
            objects.push({ entryId, entryTypeKey });
        }
        const permNeeded = mode === "propose" ? api.CorePerm.proposeEditToEntry : api.CorePerm.applyEditsToEntries;
        await requirePermission(permNeeded, objects);
    }
    // If there are any schema changes, make sure the uesr has permission to modify the schema:
    if (hasSchemaChanges) {
        const permNeeded = mode === "propose" ? api.CorePerm.proposeEditToSchema : api.CorePerm.applyEditsToSchema;
        await requirePermission(permNeeded, [{}]);
    }
}
