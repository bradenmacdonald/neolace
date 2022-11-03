import { api, getGraph } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { Site } from "neolace/core/Site.ts";
import { ActionObject, ActionSubject } from "neolace/core/permissions/action.ts";
import { checkPermissionsForAll } from "neolace/core/permissions/check.ts";
import { Entry } from "neolace/core/entry/Entry.ts";

/**
 * A helper function to get a draft
 */
export async function getDraft(
    id: VNID,
    siteId: VNID,
    tx: WrappedTransaction,
    flags: Set<api.GetDraftFlags> = new Set(),
): Promise<api.DraftData> {
    const draftData = await tx.pullOne(Draft, (d) =>
        d
            .title
            .description
            .author((a) => a.username().fullName)
            .created
            .status
            .if("edits", (d) => d.edits((e) => e.id.code.changeType.timestamp.data)), {
        key: id,
        where: C`EXISTS { MATCH (@this)-[:${Draft.rel.FOR_SITE}]->(:${Site} {id: ${siteId}}) }`,
        flags: Array.from(flags),
    });

    const author = draftData.author;
    if (author === null) {
        throw new Error(`Internal error, author shouldn't be null on Draft ${id}.`);
    }

    // TODO: fix this so we can just "return draftData"; currently it doesn't work because the "author" virtual prop is sometimes nullable
    return {
        id,
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
    /** Keys are the new entryIDs, values are the new entry types */
    const hasNewEntriesOfTypes = new Map<VNID, VNID>();
    const hasChangesToEntries = new Set<VNID>();

    if (previousEdits) {
        for (const e of previousEdits) {
            if (e.code === "CreateEntry") {
                hasNewEntriesOfTypes.set(e.data.id, e.data.type); // add an entry to the map, associating the entry ID with the entryTypeId
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
                hasNewEntriesOfTypes.set(entryEdit.data.id, entryEdit.data.type); // add an entry to the map, associating the entry ID with the entryTypeId
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
        const objects = Array.from(hasNewEntriesOfTypes.entries()).map(([entryId, entryTypeId]) => ({
            entryId,
            entryTypeId,
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
            const entryTypeId = hasNewEntriesOfTypes.get(entryId) ??
                (await graph.pullOne(Entry, (e) => e.id.type((t) => t.id), { key: entryId })).type!.id;
            objects.push({ entryId, entryTypeId });
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
