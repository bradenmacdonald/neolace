import { EditList, getEditType } from "neolace/deps/neolace-api.ts";
import { defineAction, VNID } from "neolace/deps/vertex-framework.ts";
import { EditHadNoEffect, editImplementations } from "./implementations.ts";

/**
 * Apply a set of edits (to schema and/or content)
 */
export const ApplyEdits = defineAction({
    type: "ApplyEdits",
    parameters: {} as {
        siteId: VNID;
        /** The ID of the draft whose edits we are applying. This is required if any of the edits need to access files uploaded to the draft. */
        draftId?: VNID;
        edits: EditList;
    },
    resultData: {},
    apply: async (tx, data) => {
        const siteId = data.siteId;
        const modifiedNodes = new Set<VNID>();
        const descriptions: string[] = [];

        for (const edit of data.edits) {
            const editTypeDefinition = getEditType(edit.code);
            const implementation = editImplementations[edit.code];
            if (implementation === undefined) {
                throw new Error(`Cannot apply unknown/unsupported edit type: ${edit.code}`);
            }

            // Actually do the edit:
            const result = await implementation(tx, edit.data, siteId, data.draftId);
            if (result === EditHadNoEffect) {
                // This particular edit had no effect. We don't need to record it.
            } else {
                // Record the result of this edit:
                const description = editTypeDefinition.describe(edit.data);
                descriptions.push(description);
                for (const nodeId of result.modifiedNodes) {
                    modifiedNodes.add(nodeId);
                }
            }
        }

        return {
            resultData: {},
            modifiedNodes: [...modifiedNodes],
            description: descriptions.length > 0 ? descriptions.join(", ") : "(no changes)",
        };
    },
});
