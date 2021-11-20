import * as check from "neolace/deps/computed-types.ts";
import { PropertyMode, PropertyType } from "neolace/deps/neolace-api.ts";
import {
    C,
    Field,
    RawVNode,
    ValidationError,
    VirtualPropType,
    VNodeType,
    WrappedTransaction,
} from "neolace/deps/vertex-framework.ts";
import { Site } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";


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
        /** Name of this property, displayed as the label when viewing an entry with this property value */
        name: Field.String,
        /** Description of this property (markdown) */
        descriptionMD: Field.String.Check(check.string.trim().max(5_000)),
        /** What type of property is this - a relationship, or some other simple property? */
        type: Field.String.Check(check.Schema.enum(PropertyType)),
        /** Is this a property that can be set manually? Or MUST be set? Or is it computed automatically? */
        mode: Field.String.Check(check.Schema.enum(PropertyMode)),
        /**
         * A lookup expression (usually an "x expression") that defines what values are allowed.
         * This property is ignored if mode is "Auto".
         */
        valueConstraint: Field.NullOr.String,
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
         * Default importance of this property, 0 being most important, 99 being least.
         * Properties with importance < 20 are not shown on entry pages by default.
         */
        importance: Field.Int.Check(check.number.min(0).max(99)),
        /**
         * Markdown template for formatting this value in a particular way.
         * e.g. use `[{value}](https://www.wikidata.org/wiki/{value})` to format a Wikidata Q ID as a link.
         */
        displayAs: Field.String,
        /** Text shown to users when they go to edit this property value. */
        editNoteMD: Field.String,
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

    static async validate(dbObject: RawVNode<typeof Property>, tx: WrappedTransaction): Promise<void> {

        // IS A relationships cannot be marked as inheritable. They define inheritance.
        if (dbObject.type === PropertyType.RelIsA && dbObject.inheritable) {
            throw new ValidationError(`"IS A" relationship properties cannot be marked as inheritable.`);
        }

        // Make sure each related entry type or property is from the same site:
        await tx.pullOne(
            Property,
            p => p.site(s => s.id).appliesTo(et => et.site(s => s.id)).parentProperties(p => p.site(s => s.id)),
            {key: dbObject.id}
        ).then(p => {
            const siteId = p.site?.id;
            if (siteId === undefined) { throw new Error("Site missing - shouldn't happen"); }
            p.appliesTo.forEach(et => {
                if (et.site?.id !== siteId) {
                    throw new ValidationError("AppliesTo EntryType is from a different Site.");
                }
            });
            p.parentProperties.forEach(pp => {
                if (pp.site?.id !== siteId) {
                    throw new ValidationError("isA [Parent Property] is from a different Site.");
                }
            });
        });
    }
}
