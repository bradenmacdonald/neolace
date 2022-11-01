import * as api from "neolace/deps/neolace-api.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";

type EditCode = api.AnyEdit["code"];

export const EditHadNoEffect = Symbol("EditHadNoEffect");

export type EditImplementation<EditType extends api.EditType> = (
    tx: WrappedTransaction,
    data: api.Edit<EditType>["data"],
    siteId: VNID,
    /**
     * The ID of the draft whose edits we are applying.
     * This is required if any of the edits need to access files uploaded to the draft.
     * TODO: we could make the temporary file uploads independent of drafts.
     */
    draftId?: VNID,
) => Promise<{ modifiedNodes: VNID[]; oldValues?: Record<string, unknown> } | typeof EditHadNoEffect>;

export function defineImplementation<EditType extends api.ContentEditType | api.SchemaEditType>(
    editType: EditType,
    impl: EditImplementation<EditType>,
) {
    const code = editType.code as EditCode;
    return { code, impl };
}

// Content edit implementations:
import { doAddPropertyValue } from "./content/AddPropertyValue.ts";
import { doCreateEntry } from "./content/CreateEntry.ts";
import { doDeleteEntry } from "./content/DeleteEntry.ts";
import { doDeletePropertyValue } from "./content/DeletePropertyValue.ts";
import { doSetEntryDescription } from "./content/SetEntryDescription.ts";
import { doSetEntryFriendlyId } from "./content/SetEntryFriendlyId.ts";
import { doSetEntryName } from "./content/SetEntryName.ts";
import { doUpdateEntryFeature } from "./content/UpdateEntryFeature.ts";
import { doUpdatePropertyValue } from "./content/UpdatePropertyValue.ts";
// Schema edit implementations:
import { doCreateEntryType } from "./schema/CreateEntryType.ts";
import { doCreateProperty } from "./schema/CreateProperty.ts";
import { doDeleteEntryType } from "./schema/DeleteEntryType.ts";
import { doDeleteProperty } from "./schema/DeleteProperty.ts";
import { doUpdateEntryType } from "./schema/UpdateEntryType.ts";
import { doUpdateEntryTypeFeature } from "./schema/UpdateEntryTypeFeature.ts";
import { doUpdateProperty } from "./schema/UpdateProperty.ts";

export const editImplementations: Partial<Record<EditCode, EditImplementation<api.EditType>>> = Object.freeze({
    // Content edits:
    [doAddPropertyValue.code]: doAddPropertyValue.impl,
    [doCreateEntry.code]: doCreateEntry.impl,
    [doDeleteEntry.code]: doDeleteEntry.impl,
    [doDeletePropertyValue.code]: doDeletePropertyValue.impl,
    [doSetEntryDescription.code]: doSetEntryDescription.impl,
    [doSetEntryFriendlyId.code]: doSetEntryFriendlyId.impl,
    [doSetEntryName.code]: doSetEntryName.impl,
    [doUpdateEntryFeature.code]: doUpdateEntryFeature.impl,
    [doUpdatePropertyValue.code]: doUpdatePropertyValue.impl,
    // Schema edits:
    [doCreateEntryType.code]: doCreateEntryType.impl,
    [doCreateProperty.code]: doCreateProperty.impl,
    [doDeleteEntryType.code]: doDeleteEntryType.impl,
    [doDeleteProperty.code]: doDeleteProperty.impl,
    [doUpdateEntryType.code]: doUpdateEntryType.impl,
    [doUpdateEntryTypeFeature.code]: doUpdateEntryTypeFeature.impl,
    [doUpdateProperty.code]: doUpdateProperty.impl,
});
