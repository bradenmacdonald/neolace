import * as check from "neolace/deps/computed-types.ts";
import { DraftStatus, EditChangeType, EditList, getEditType } from "neolace/deps/neolace-api.ts";
import {
    C,
    defaultUpdateFor,
    defineAction,
    DerivedProperty,
    Field,
    FieldValidationError,
    RawVNode,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Site } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
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
        dataJSON: Field.String.Check(check.string.max(100_000)),
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
        description: Field.NullOr.String,
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

export const UpdateDraft = defaultUpdateFor(Draft, (d) => d.title.description, {
    otherUpdates: async (
        args: {
            addEdits?: EditList;
        },
        tx,
        nodeSnapshot,
    ) => {
        const additionalModifiedNodes: VNID[] = [];

        if (args.addEdits?.length) {
            // Add edits to this draft:

            const editsExpanded = args.addEdits.map((e) => ({
                id: VNID(),
                code: e.code,
                dataJSON: JSON.stringify(e.data),
                changeType: getEditType(e.code).changeType,
            }));

            await tx.query(C`
                MATCH (draft:${Draft} {id: ${nodeSnapshot.id}})
                UNWIND ${editsExpanded} AS editData
                CREATE (edit:${DraftEdit} {id: editData.id})
                CREATE (draft)-[:${Draft.rel.HAS_EDIT}]->(edit)
                SET edit.code = editData.code
                SET edit.dataJSON = editData.dataJSON
                SET edit.changeType = editData.changeType
                SET edit.timestamp = datetime.realtime()
            `);

            additionalModifiedNodes.push(...editsExpanded.map((e) => e.id));
        }

        return { additionalModifiedNodes };
    },
});

/**
 * Add a file to a draft
 */
export const AddFileToDraft = defineAction({
    type: "AddFileToDraft",
    parameters: {} as {
        draftId: VNID;
        dataFileId: VNID;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const id = VNID();

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
        `.RETURN({}));

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
            MATCH (dataFile:${DataFile} {id: ${data.dataFileId}})
        `.RETURN({}));

        const result = await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.draftId}})
            MATCH (dataFile:${DataFile} {id: ${data.dataFileId}})
            MERGE (draft)-[:${Draft.rel.HAS_FILE}]->(draftFile:${DraftFile})-[:${DraftFile.rel.HAS_DATA}]->(dataFile)
                ON CREATE SET draftFile.timestamp = datetime.realtime(), draftFile.id = ${id}
        `.RETURN({ "draftFile.id": Field.VNID }));

        return {
            resultData: { id: result["draftFile.id"] },
            modifiedNodes: [data.draftId, result["draftFile.id"]],
            description: `Added file to ${Draft.withId(id)}`,
        };
    },
});

/**
 * Create a draft
 */
export const CreateDraft = defineAction({
    type: "CreateDraft",
    parameters: {} as {
        id?: VNID;
        siteId: VNID;
        authorId: VNID;
        edits: EditList;
        title: string;
        description: string | null;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const id = data.id ?? VNID();

        await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            MATCH (author:${User} {id: ${data.authorId}})
            CREATE (draft:${Draft} {id: ${id}})
            SET draft.title = ${data.title}
            SET draft.description = ${data.description}
            SET draft.status = ${DraftStatus.Open}
            SET draft.created = datetime()
            CREATE (draft)-[:${Draft.rel.FOR_SITE}]->(site)
            CREATE (draft)-[:${Draft.rel.AUTHORED_BY}]->(author)
        `.RETURN({}));

        const otherModifiedNodes: VNID[] = [];
        if (data.edits.length > 0) {
            const { modifiedNodes } = await UpdateDraft.apply(tx, { key: id, addEdits: data.edits });
            otherModifiedNodes.push(...modifiedNodes);
        }

        return {
            resultData: { id },
            modifiedNodes: [id, ...otherModifiedNodes],
            description: `Created ${Draft.withId(id)}`,
        };
    },
});

/**
 * Accept a draft, applying its changes
 */
export const AcceptDraft = defineAction({
    type: "AcceptDraft",
    parameters: {} as {
        id: VNID;
    },
    resultData: {} as { id: VNID },
    apply: async (tx, data) => {
        const draft = await tx.pullOne(Draft, (d) => d.status.site((s) => s.id).edits((e) => e.code.data()), {
            key: data.id,
        });
        if (draft.status !== DraftStatus.Open) {
            throw new Error("Draft is not open.");
        }

        await tx.queryOne(C`
            MATCH (draft:${Draft} {id: ${data.id}})
            SET draft.status = ${DraftStatus.Accepted}
        `.RETURN({}));

        const { modifiedNodes } = await ApplyEdits.apply(tx, {
            siteId: draft.site!.id,
            draftId: data.id,
            // deno-lint-ignore no-explicit-any
            edits: draft.edits as any,
        });

        return {
            resultData: { id: data.id },
            modifiedNodes: [data.id, ...modifiedNodes],
            description: `Accepted ${Draft.withId(data.id)}`,
        };
    },
});
