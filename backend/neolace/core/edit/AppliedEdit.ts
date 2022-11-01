import * as check from "neolace/deps/computed-types.ts";
import { EditChangeType, getEditType } from "neolace/deps/neolace-api.ts";
import {
    DerivedProperty,
    Field,
    FieldValidationError,
    RawVNode,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
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
        dataJSON: Field.String.Check(check.string.max(1_000_000)),
        /** for edits that overwrite or delete data, this can hold information about the old value. */
        oldDataJSON: Field.String.Check(check.string.max(1_000_000)),
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

    static derivedProperties = this.hasDerivedProperties({
        data: dataFromJson,
        oldData: oldDataFromJson,
    });

    static async validate(dbObject: RawVNode<typeof AppliedEdit>, _tx: WrappedTransaction): Promise<void> {
        // Validate that "code", "changeType", and "data" are all consistent:
        const editType = getEditType(dbObject.code);
        if (dbObject.changeType !== editType.changeType) {
            throw new FieldValidationError("changeType", "Edit's code does not match its changeType.");
        }
        const data = JSON.parse(dbObject.dataJSON);
        try {
            editType.dataSchema(data);
        } catch (err) {
            throw new FieldValidationError("data", err.message);
        }
        // Make sure oldDataJSON is also valid JSON:
        JSON.parse(dbObject.oldDataJSON);
    }
}

// deno-lint-ignore no-explicit-any
export function dataFromJson(): DerivedProperty<any> {
    return DerivedProperty.make(
        AppliedEdit,
        (edit) => edit.dataJSON,
        (editData) => JSON.parse(editData.dataJSON),
    );
}

// deno-lint-ignore no-explicit-any
export function oldDataFromJson(): DerivedProperty<any> {
    return DerivedProperty.make(
        AppliedEdit,
        (edit) => edit.oldDataJSON,
        (editData) => JSON.parse(editData.oldDataJSON),
    );
}
