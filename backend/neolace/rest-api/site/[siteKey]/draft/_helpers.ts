import { getGraph, NeolaceHttpRequest, SDK } from "neolace/rest-api/mod.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { ActionObject, ActionSubject } from "neolace/core/permissions/action.ts";
import { checkPermissionsForAll } from "neolace/core/permissions/check.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

/** Get a draft's unique VNID from the draftNum path parameter in the current request */
export async function getDraftIdFromRequest(request: NeolaceHttpRequest, siteId: VNID) {
    const draftNumStr = request.pathParam("draftNum") ?? "";
    const draftNum = parseInt(draftNumStr);
    if (draftNum <= 0 || isNaN(draftNum)) {
        throw new SDK.InvalidFieldValue([{
            fieldPath: "draftNum",
            message: `Expected an integer draft draftNum (got: ${draftNumStr})`,
        }]);
    }
    return await getDraftId(draftNum, siteId);
}

/** Get a draft's unique VNID from its site-specific draftNum */
export async function getDraftId(draftNum: number, siteId: VNID): Promise<VNID> {
    const graph = await getGraph();
    const data = await graph.read((tx) =>
        tx.pullOne(Draft, (d) => d.id, { with: { siteNamespace: siteId, num: draftNum } })
    );
    return data.id;
}

/**
 * A helper function to get a draft
 */
export async function getDraft(
    draftId: VNID,
    tx: WrappedTransaction,
    flags: Set<SDK.GetDraftFlags> = new Set(),
): Promise<SDK.DraftData> {
    const draftData = await tx.pullOne(Draft, (d) =>
        d
            .num
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
        num: draftData.num,
        author,
        created: draftData.created,
        title: draftData.title,
        description: draftData.description,
        status: draftData.status,
        edits: draftData.edits as
            | (SDK.AnyEdit & { id: VNID; changeType: SDK.EditChangeType; timestamp: Date })[]
            | undefined,
    };
}

export async function checkPermissionsRequiredForEdits(
    edits: SDK.EditList,
    subject: ActionSubject,
    mode: "propose" | "apply",
    /**
     * Edits that are already in the draft; we don't check their permissions but we may need them to determine entry
     * types on subsequent edits that we are checking.
     */
    previousEdits?: SDK.EditList,
) {
    if (subject.userId === undefined) {
        throw new SDK.NotAuthenticated();
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
        const editType = SDK.getEditType(e.code);
        if (editType.changeType === SDK.EditChangeType.Schema) {
            hasSchemaChanges = true;
        } else if (editType.changeType === SDK.EditChangeType.Content) {
            const entryEdit = e as SDK.AnyContentEdit; // Tell TypeScript that this is definitely a content edit now
            if (entryEdit.code === "CreateEntry") {
                hasNewEntriesOfTypes.set(entryEdit.data.entryId, entryEdit.data.entryTypeKey); // add an entry to the map, associating the entry ID with the entryTypeId
            } else {
                hasChangesToEntries.add(entryEdit.data.entryId);
            }
        }
    }

    const requirePermission = async (perm: SDK.PermissionName, objects: ActionObject[]) => {
        const results = await checkPermissionsForAll(subject, perm, objects);
        if (results.length !== objects.length) throw new Error(`Internal error in permissions check`);
        if (!results.every((r) => r === true)) {
            throw new SDK.NotAuthorized("You do not have sufficient permissions.");
        }
    };

    // If there are any newly created entries, make sure the user has permission to create entries of that type:
    if (hasNewEntriesOfTypes) {
        const objects = Array.from(hasNewEntriesOfTypes.entries()).map(([entryId, entryTypeKey]) => ({
            entryId,
            entryTypeKey,
        }));
        const permNeeded = mode === "propose" ? SDK.CorePerm.proposeNewEntry : SDK.CorePerm.applyEditsToEntries;
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
        const permNeeded = mode === "propose" ? SDK.CorePerm.proposeEditToEntry : SDK.CorePerm.applyEditsToEntries;
        await requirePermission(permNeeded, objects);
    }
    // If there are any schema changes, make sure the uesr has permission to modify the schema:
    if (hasSchemaChanges) {
        const permNeeded = mode === "propose" ? SDK.CorePerm.proposeEditToSchema : SDK.CorePerm.applyEditsToSchema;
        await requirePermission(permNeeded, [{}]);
    }
}
