/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import * as check from "neolace/deps/computed-types.ts";
import { EditChangeType, getEditType } from "neolace/deps/neolace-sdk.ts";
import { Field, FieldValidationError, RawVNode, VNodeType } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { EditSource } from "./EditSource.ts";

/**
 * An AppliedEdit is a specific change that has actually been applied to the database, made by the user within a Draft
 * or by a Connector.
 *
 * If an edit is attempted but results in no changes at all, no Edit record should be created.
 */
export class AppliedEdit extends VNodeType {
    static readonly label = "AppliedEdit";

    static readonly properties = {
        ...VNodeType.properties,
        code: Field.String,
        // changeType: is this a content edit or a schema edit?
        changeType: Field.String.Check(check.Schema.enum(EditChangeType)),
        data: Field.JsonObjString,
        /** for edits that overwrite or delete data, this can hold information about the old value. */
        oldData: Field.JsonObjString,
        timestamp: Field.DateTime,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_EDIT_SOURCE: {
            to: [EditSource],
            properties: {},
            cardinality: VNodeType.Rel.ToOneOrNone,
        },
        MODIFIED: {
            to: [Entry],
            properties: {},
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({});

    static derivedProperties = this.hasDerivedProperties({});

    static override async validate(dbObject: RawVNode<typeof AppliedEdit>): Promise<void> {
        // Validate that "code", "changeType", and "data" are all consistent:
        const editType = getEditType(dbObject.code);
        if (dbObject.changeType !== editType.changeType) {
            throw new FieldValidationError("changeType", "Edit's code does not match its changeType.");
        }
    }
}
