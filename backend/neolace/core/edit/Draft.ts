import * as check from "neolace/deps/computed-types.ts";
import { DraftStatus, EditChangeType, getEditType } from "neolace/deps/neolace-api.ts";
import {
    C,
    DerivedProperty,
    Field,
    FieldValidationError,
    RawVNode,
    VirtualPropType,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Site } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { DataFile } from "neolace/core/objstore/DataFile.ts";

/**
 * A DraftEdit is a specific change within a Draft.
 */
export class DraftEdit extends VNodeType {
    static readonly label = "DraftEdit";

    static readonly properties = {
        ...VNodeType.properties,
        code: Field.String,
        // changeType: is this a content edit or a schema edit?
        changeType: Field.String.Check(check.Schema.enum(EditChangeType)),
        dataJSON: Field.String.Check(check.string.max(1_000_000)),
        timestamp: Field.DateTime,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties({});

    static derivedProperties = this.hasDerivedProperties({
        data: dataFromJson,
    });

    static async validate(dbObject: RawVNode<typeof DraftEdit>, _tx: WrappedTransaction): Promise<void> {
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
    }
}

// deno-lint-ignore no-explicit-any
export function dataFromJson(): DerivedProperty<any> {
    return DerivedProperty.make(
        DraftEdit,
        (edit) => edit.dataJSON,
        (editData) => JSON.parse(editData.dataJSON),
    );
}

/**
 * A DraftFile is a file attached to a draft, which can then be assigned to an entry (e.g. an image entry). The
 * reference to this file is only valid while the draft is open, and cannot be used after the draft is accepted/closed.
 */
export class DraftFile extends VNodeType {
    static readonly label = "DraftFile";

    static readonly properties = {
        ...VNodeType.properties,
        timestamp: Field.DateTime,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        HAS_DATA: {
            to: [DataFile],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        dataFile: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.HAS_DATA}]->(@target:${DataFile})`,
            target: DataFile,
        },
    });
}

/**
 * A Draft is a proposed set of edits to a site's content or schema.
 *
 * Most changes to a site's content happen via Drafts. A user can push a set of edits as a draft, and optionally wait
 * for others to review the draft, then accept the draft.
 */
export class Draft extends VNodeType {
    static readonly label = "Draft";

    static readonly properties = {
        ...VNodeType.properties,
        title: Field.String.Check(check.string.min(1).max(1_000)),
        description: Field.String,
        created: Field.DateTime,
        status: Field.Int.Check(check.Schema.enum(DraftStatus)),
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        FOR_SITE: {
            to: [Site],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        AUTHORED_BY: {
            to: [User],
            properties: {},
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        HAS_EDIT: {
            to: [DraftEdit],
            properties: {},
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        HAS_FILE: {
            to: [DraftFile],
            properties: {},
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        MODIFIES: {
            to: [Entry],
            properties: {},
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        author: {
            type: VirtualPropType.OneRelationship,
            target: User,
            query: C`(@this)-[:${this.rel.AUTHORED_BY}]->(@target:${User})`,
        },
        edits: {
            type: VirtualPropType.ManyRelationship,
            target: DraftEdit,
            query: C`(@this)-[:${this.rel.HAS_EDIT}]->(@target:${DraftEdit})`,
            defaultOrderBy: `@this.timestamp`,
        },
        files: {
            type: VirtualPropType.ManyRelationship,
            target: DraftFile,
            query: C`(@this)-[:${this.rel.HAS_FILE}]->(@target:${DraftFile})`,
            defaultOrderBy: `@this.timestamp`,
        },
        modifiesEntries: {
            type: VirtualPropType.ManyRelationship,
            target: Entry,
            query: C`(@this)-[:${this.rel.MODIFIES}]->(@target:${Entry})`,
        },
        site: {
            type: VirtualPropType.OneRelationship,
            target: Site,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target:${Site})`,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        hasSchemaChanges,
        hasContentChanges,
    });

    static async validate(_dbObject: RawVNode<typeof this>, _tx: WrappedTransaction): Promise<void> {
        // We don't verify if user is part of Site, because users can open a Draft then be removed from a Site but
        // their Draft should live on.
    }
}

/** Does this draft contain edits to the schema? */
export function hasSchemaChanges(): DerivedProperty<boolean> {
    return DerivedProperty.make(
        Draft,
        (draft) => draft.edits((e) => e.changeType),
        (data) => !!data.edits.find((e) => e.changeType === EditChangeType.Schema),
    );
}
/** Does this draft contain edits to the content? */
export function hasContentChanges(): DerivedProperty<boolean> {
    return DerivedProperty.make(
        Draft,
        (draft) => draft.edits((e) => e.changeType),
        (data) => !!data.edits.find((e) => e.changeType === EditChangeType.Content),
    );
}
