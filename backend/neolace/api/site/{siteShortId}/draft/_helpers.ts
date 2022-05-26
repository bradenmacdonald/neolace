import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { Draft } from "neolace/core/edit/Draft.ts";
import { Site } from "neolace/core/Site.ts";

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
            .if("edits", (d) => d.edits((e) => e.id.code.changeType.timestamp.data())), {
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
        edits: draftData.edits?.map((e) => ({
            ...e,
            changeType: e.changeType as api.EditChangeType,
            data: e.data ?? undefined,
        })),
    };
}
