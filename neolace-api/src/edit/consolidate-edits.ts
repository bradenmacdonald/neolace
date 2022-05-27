import { type AnyEdit, getEditType } from "./AnyEdit.ts";

/**
 * Given a list of edits that would be applied in order, combine any redundant edits that aren't needed and return the
 * new list.
 * 
 * For example, two edits that rename the same entry from to "B" and then to "C" can be replaced by a single edit that
 * renames the entry to "C".
 */
export function consolidateEdits<EditTypes extends (AnyEdit)[]>(edits: EditTypes): EditTypes {
    const newEdits = [...edits];

    // C = "current" edit, P = "previous" edit
    for (let c = 1; c < newEdits.length; c++) {
        for (let p = c - 1; p >= 0; p--) {
            const currentEdit = newEdits[c];
            const prevEdit = newEdits[p];
            const consolidatedEdit = getEditType(currentEdit.code).consolidate?.(currentEdit, prevEdit);
            if (consolidatedEdit) {
                // Replace the previous edit with the new consolidated edit:
                newEdits[p] = consolidatedEdit;
                // Delete the now-redundant current edit:
                newEdits.splice(c, 1);
                // Continue with the same current edit (now has one lower index of "c") and earlier previous edit
                c--;
            }
        }
    }
    return newEdits as EditTypes;
}
