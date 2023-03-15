/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as api from "neolace/deps/neolace-sdk.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";

type EditCode = api.AnyEdit["code"];

export const EditHadNoEffect = Symbol("EditHadNoEffect");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Regular edits (to content and schema)

export type EditImplementation<EditType extends api.EditType> = (
    tx: WrappedTransaction,
    data: api.Edit<EditType>["data"],
    siteId: VNID,
    /**
     * The ID of the Draft or Connection whose edits we are applying.
     * This is required if any of the edits need to access files uploaded to the draft.
     * TODO: we could make the temporary file uploads independent of drafts.
     */
    editSourceId?: VNID,
) => Promise<{ modifiedNodes: VNID[]; oldValues?: Record<string, unknown> } | typeof EditHadNoEffect>;

// Helper function to get the typing correct when defining edit implementations
export function defineImplementation<EditType extends api.ContentEditType | api.SchemaEditType>(
    editType: EditType,
    impl: EditImplementation<EditType>,
) {
    const code = editType.code as EditCode;
    return { code, impl };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Bulk edits (to content, via a Connection/Connector Plugin)

export type BulkAppliedEditData = api.AnyContentEdit & {
    modifiedNodes: VNID[];
    oldData: Record<string, unknown>; // TODO: add strong typing for this field, specific to each edit.
};

export type BulkEditImplementation<EditType extends api.EditType> = (
    tx: WrappedTransaction,
    data: api.Edit<EditType>["data"][],
    siteId: VNID,
    connectionId?: VNID,
) => Promise<{ appliedEdits: BulkAppliedEditData[] }>;

// Helper function to get the typing correct when defining bulk edit implementations
export function defineBulkImplementation<EditType extends api.BulkEditType>(
    _editType: EditType,
    impl: BulkEditImplementation<EditType>,
) {
    return impl;
}
