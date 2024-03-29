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
import { PropertyMode, PropertyType } from "neolace/deps/neolace-sdk.ts";
import {
    C,
    Field,
    RawRelationships,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNID,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { keyProps, validateSiteNamespace } from "../key.ts";

/**
 * A Property is used to define an allowed relationship between entries, or a type of data about an entry
 *
 * For example, for a Person entry, "Date of Birth" would be a data property, and "Father" would be a relationship
 * property.
 */
export class Property extends VNodeType {
    static label = "Property";
    static properties = {
        ...VNodeType.properties,
        ...keyProps,
        /** Name of this property, displayed as the label when viewing an entry with this property value */
        name: Field.String,
        /** Description of this property (markdown) */
        description: Field.String.Check(check.string.trim().max(5_000)),
        /** What type of property is this - a relationship, or some other simple property? */
        type: Field.String.Check(check.Schema.enum(PropertyType)),
        /** Is this a property that can be set manually? Or MUST be set? Or is it computed automatically? */
        mode: Field.String.Check(check.Schema.enum(PropertyMode)),
        /**
         * A lookup expression (usually an "x expression") that defines what values are allowed.
         * This property is ignored if mode is "Auto".
         */
        valueConstraint: Field.String,
        /**
         * The default value for this property, if none is set on the specific entry or its parents.
         * This can be a lookup expression.
         * If mode is Auto, this is required, because this defines the lookup expression.
         */
        default: Field.String,
        /** Do values from this property inherit automatically to child entries? */
        inheritable: Field.Boolean,
        /** The standard URL for this property, e.g. "https://schema.org/birthDate" for "date of birth" */
        standardURL: Field.String,
        /**
         * Default rank of this property, 0 being most important, 99 being least.
         * Only properties with rank < 50 are shown on entry pages by default.
         */
        rank: Field.Int.Check(check.number.min(0).max(99)),
        /**
         * Markdown template for formatting this value in a particular way.
         * e.g. use `[{value}](https://www.wikidata.org/wiki/{value})` to format a Wikidata Q ID as a link.
         */
        displayAs: Field.String,
        /** Text shown to users when they go to edit this property value. */
        editNote: Field.String,
        /** Enabling "slots" allows partial overriding of inherited properties, useful for "HAS PART" relationships */
        enableSlots: Field.Boolean,
    };

    static readonly rel = this.hasRelationshipsFromThisTo({
        /** Which Site's schema this property is part of */
        FOR_SITE: {
            to: [Site],
            cardinality: VNodeType.Rel.ToOneRequired,
        },
        /** Which Entry Types this property can be applied to */
        APPLIES_TO_TYPE: {
            to: [EntryType],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
        /** This property is a sub-type of another property/properties */
        HAS_PARENT_PROP: {
            to: [this],
            cardinality: VNodeType.Rel.ToManyUnique,
        },
    });

    static virtualProperties = this.hasVirtualProperties({
        site: {
            type: VirtualPropType.OneRelationship,
            query: C`(@this)-[:${this.rel.FOR_SITE}]->(@target)`,
            target: Site,
        },
        appliesTo: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.APPLIES_TO_TYPE}]->(@target)`,
            target: EntryType,
        },
        parentProperties: {
            type: VirtualPropType.ManyRelationship,
            query: C`(@this)-[:${this.rel.HAS_PARENT_PROP}]->(@target)`,
            target: this,
        },
    });

    static derivedProperties = this.hasDerivedProperties({
        // numRelatedImages,
    });

    static async validate(dbObject: RawVNode<typeof Property>, relationships: RawRelationships[]): Promise<void> {
        // IS A relationships cannot be marked as inheritable. They define inheritance.
        if (dbObject.type === PropertyType.RelIsA && dbObject.inheritable) {
            throw new ValidationError(`"IS A" relationship properties cannot be marked as inheritable.`);
        }
        // Validate that siteNamespace is correct.
        validateSiteNamespace(this, dbObject, relationships, this.rel.FOR_SITE);
    }

    static override async validateExt(vnodeIds: VNID[], tx: WrappedTransaction): Promise<void> {
        // Make sure each related entry type or property is from the same site:
        const data = await tx.pull(
            Property,
            (p) =>
                p.site((s) => s.id).appliesTo((et) => et.site((s) => s.id)).parentProperties((p) =>
                    p.site((s) => s.id)
                ),
            { where: C`@this.id IN ${vnodeIds}` },
        );
        for (const p of data) {
            const siteId = p.site?.id;
            if (siteId === undefined) throw new Error("Site missing - shouldn't happen");
            p.appliesTo.forEach((et) => {
                if (et.site?.id !== siteId) {
                    throw new ValidationError("AppliesTo EntryType is from a different Site.");
                }
            });
            p.parentProperties.forEach((pp) => {
                if (pp.site?.id !== siteId) {
                    throw new ValidationError("isA [Parent Property] is from a different Site.");
                }
            });
        }
    }
}
