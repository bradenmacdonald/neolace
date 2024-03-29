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
import { DraftStatus, EditChangeType, getEditType } from "neolace/deps/neolace-sdk.ts";
import {
    C,
    DerivedProperty,
    Field,
    FieldValidationError,
    getRelationshipType,
    RawRelationships,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNodeType,
} from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { Site } from "neolace/core/Site.ts";
import { User } from "neolace/core/User.ts";
import { EditSource } from "./EditSource.ts";

/**
 * A DraftEdit is a proposed edit within a Draft.
 */
export class DraftEdit extends VNodeType {
    static readonly label = "DraftEdit";

    static readonly properties = {
        ...VNodeType.properties,
        code: Field.String,
        // changeType: is this a content edit or a schema edit?
        changeType: Field.String.Check(check.Schema.enum(EditChangeType)),
        data: Field.JsonObjString,
        timestamp: Field.DateTime,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({});

    static virtualProperties = this.hasVirtualProperties({});

    static derivedProperties = this.hasDerivedProperties({});

    static async validate(dbObject: RawVNode<typeof DraftEdit>): Promise<void> {
        // Validate that "code", "changeType", and "data" are all consistent:
        const editType = getEditType(dbObject.code);
        if (dbObject.changeType !== editType.changeType) {
            throw new FieldValidationError("changeType", "Edit's code does not match its changeType.");
        }
        // Validate that the edit data matches the schema for that edit type:
        editType.dataSchema(dbObject.data);
    }
}

/**
 * A Draft is a proposed set of edits to a site's content or schema.
 *
 * Most changes to a site's content happen via Drafts. A user can push a set of edits as a draft, and optionally wait
 * for others to review the draft, then accept the draft.
 */
export class Draft extends EditSource {
    static readonly label = "Draft";

    static readonly properties = {
        ...VNodeType.properties,
        /**
         * The VNID of the site with which this draft is associated. This just exists so that Neo4j can create a unique
         * constraint on [site, num]. This should always be the same as the ID of the FOR_SITE->(:Site) node.
         */
        siteNamespace: Field.VNID,
        /** The site-specific incrementing unqiue permanent number for this Draft. */
        num: Field.Int,
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

    static override async validate(
        rawNode: RawVNode<typeof this>,
        relationships: RawRelationships[],
    ): Promise<void> {
        // Validate that siteNamespace is correct.
        const forSiteRel = relationships.find((r) => r.relType === getRelationshipType(this.rel.FOR_SITE));
        const siteId = forSiteRel?.targetId;
        if (siteId !== rawNode.siteNamespace || siteId === undefined) {
            throw new ValidationError("Draft has incorrect siteNamespace.");
        }

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
