import { Schema, Type, string, number, vnidString, nullable, array, Record, } from "../api-schemas.ts";


export const SimplePropertySchema = Schema({
    id: vnidString,
    /** Displayed label of this simple property value, e.g. "Is a type of" */
    label: string,
    valueExpression: string,
    importance: number,
    note: string,
});
export type SimplePropertyData = Type<typeof SimplePropertySchema>;


export const EntryTypeSchema = Schema({
    id: vnidString,
    /** Name of this entry type, e.g. "Note", "Task", "Contact", "License", etc. Doesn't need to be unique. */
    name: string,
    description: nullable(string),
    /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
    friendlyIdPrefix: nullable(string),
    /** Simple property values always displayed on entries of this type */
    simplePropValues: Record(string, SimplePropertySchema),

    enabledFeatures: Schema({
        Article: Schema({
        }).strictOptional(),
        UseAsProperty: Schema({
            appliesToEntryTypes: array.of(vnidString),
        }).strictOptional(),
        Image: Schema({
        }).strictOptional(),
        HeroImage: Schema({
            lookupExpression: string,
        }).strictOptional(),
    }),
});
export type EntryTypeData = Type<typeof EntryTypeSchema>;

export enum RelationshipCategory {
    /**
     * IS_A: e.g. An Apple IS_A Fruit
     * This category of relationship includes things like IS_VERSION_OF, IS_VARIANT_OF, etc.
     */
    IS_A = "IS_A",
    /**
     * HAS_A: e.g. A Person HAS_A Name
     * This category of relationship includes things like HAS_PART, HAS_EMAIL_ADDRESS, HAS_LICENSE, HAS_MANUFACTURER, or so on
     */
    HAS_A = "HAS_A",
    /**
     * DEPENDS_ON: e.g. An Task DEPENDS_ON another Task
     */
    //DEPENDS_ON = "DEPENDS_ON",
    /**
     * RELATES_TO: e.g. An Image RELATES_TO a Article
     */
    RELATES_TO = "RELATES_TO",
}

export function CastRelationshipCategory(value: string): RelationshipCategory {
    if (!Object.values(RelationshipCategory).includes(value as RelationshipCategory)) {
        throw new Error(`Invalid RelationshipCategory: ${value}`);
    }
    return value as RelationshipCategory;
}

export const RelationshipTypeSchema = Schema({
    id: vnidString,
    /** The name of this RelationshipType (e.g. FROM_ENTRY_TYPE "is derived from" TO_ENTRY_TYPE) */
    nameForward: string,
    /** The name of the reverse of this RelationshipType (e.g. TO_ENTRY_TYPE "has derivatives" FROM_ENTRY_TYPE) */
    nameReverse: string,
    /** Relationship category - cannot be changed. */
    category: Schema.enum(RelationshipCategory),
    /** Description: Short, rich text summary of the relationship  */
    description: nullable(string),

    /**
     * What entry types this relationship can be from.
     * When a relationship is changed, the "From" entry counts as being modified.
     * So if you create a new relationship that "Fork -> is a -> Utensil", it counts as a change to Fork (the from
     * entry), not to Utensil. The change that made that relationship will only appear in the "Fork" change history.
     */
    fromEntryTypes: array.of(vnidString),
    /**
     * What entry types this relationship can be to.
     */
    toEntryTypes: array.of(vnidString),
});
export type RelationshipTypeData = Type<typeof RelationshipTypeSchema>;


export enum PropertyType {
    /**
     * A regular value (e.g. a date, a string, a boolean); the value is anything other than another entry.
     */
    Value = "VALUE",
    /**
     * This property represents an IS A relationship.
     *
     * e.g. An Apple IS_A Fruit
     *
     * This category of relationship includes things like IS_VERSION_OF, IS_VARIANT_OF, IS_SUBCLASS_OF, IS_INSTANCE_OF,
     * etc.
     */
    RelIsA = "IS_A",
    /**
     * This property represents a HAS A relationship.
     *
     * e.g. A Person HAS_A Name
     *
     * This category of relationship includes things like HAS_PART, HAS_EMAIL_ADDRESS, HAS_LICENSE, HAS_MANUFACTURER,
     * etc.
     *
     * This excludes the inverse of IS A relationships, like "has subtypes" or "has instances", which should be
     * REL_OTHER.
     */
    RelHasA = "HAS_A",
    /**
     * This property represents a RELATES TO relationship.
     *
     * e.g. An Image RELATES_TO a Article
     */
    RelRelatesTo = "RELATES_TO",
    /**
     * Any other type of relationship.
     * This is usually used for automatically-generated inverse relationships,
     * e.g. the "has subtypes" relationship which is the inverse of an IS A relationship.
     *
     * Other relationships do not appear on the graph visualizations.
     */
    RelOther = "OTHER",
}

export enum PropertyMode {
    /** This property is required. Leaving it blank will be highlighted as an error. */
    Required = 1,
    /**
     * This property is recommended. The "edit" form for this property type will always show a field to add this
     * property.
     */
    Recommended = 2,
    /**
     * This property is optional. It may be set on the specified entry type, but doesn't necessarily have to be.
     */
    Optional = 3,
    /**
     * This property is defined by a lookup expression and its value is derived from other data. It cannot be edited.
     * This can also be used to set a fixed value for all entries of a given type.
     */
    Auto = 3,
}

export const PropertySchema = Schema({
    id: vnidString,
    /** Name of this property, displayed as the label when viewing an entry with this property value */
    name: string,
    /** Description of this property (markdown) */
    descriptionMD: string,
    /** What type of property is this - a relationship, or some other simple property? */
    type: Schema.enum(PropertyType),
    /** What EntryTypes can have this property? */
    appliesTo: array.of(Schema({
        entryType: vnidString,
        /** What Entry Types this relationship can point to (if this is a relationship) */
        targetEntryTypes: array.of(vnidString).strictOptional(),
        mode: Schema.enum(PropertyMode),
        /**
         * The default value for all entries of this type, if none is set on the specific entry or its parents.
         * This can be a lookup expression.
         * If mode is Auto, this is required, because this defines the lookup expression.
         */
        default: string.strictOptional(),
    })),
    /** TODO: What types of values this can hold */
    //valueTypes: array.of(string).strictOptional(),
    /** TODO: a short list of allowed values or constraints */
    //valuesAllowed: array.of(string).strictOptional(),
    /** This property is a sub-type of some other property (e.g. "average voltage" is a type of "voltage") */
    isA: array.of(vnidString).strictOptional(),
    /** The standard URL for this property, e.g. "https://schema.org/birthDate" for "date of birth" */
    standardURL: string.strictOptional(),
    /** The Wikidata P ID for this property, if applicable, e.g. P569 for "date of birth" */
    //wikidataPID: string.strictOptional(),
    /**
     * Default importance of this property, 0 being most important, 99 being least.
     * Properties with importance < 20 are not shown on entry pages by default.
     */
    importance: number.strictOptional(),
    /** Text shown to users when they go to edit this property value. */
    editNoteMD: string.strictOptional(),
    // TODO: hasSlot, hasWeight, hasSource
});
export type PropertyData = Type<typeof PropertySchema>;



export const SiteSchemaSchema = Schema({
    entryTypes: Record(string, EntryTypeSchema),
    relationshipTypes: Record(string, RelationshipTypeSchema),
    properties: Record(string, PropertySchema),
});

/**
 * A complete specification of the schema of a neolace site.
 */
export interface SiteSchemaData {
    entryTypes: {[id: string]: EntryTypeData};
    relationshipTypes: {[id: string]: RelationshipTypeData};
    properties: {[id: string]: PropertyData};
}
// This also works but is a bit verbose because it doesn't use our named interfaces:
//export type SiteSchemaData = Type<typeof SiteSchemaSchema>;
