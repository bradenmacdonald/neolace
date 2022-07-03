import { Schema, Type, string, number, vnidString, array, boolean, Record, } from "../api-schemas.ts";

/** The available color options for each entry */
export enum EntryTypeColor {
    Default = "",
    Slate = "",
    Red = "red",
    Orange = "orange",
    Yellow = "yellow",
    Lime = "lime",
    Emerald = "emerald",
    Teal = "teal",
    Cyan = "cyan",
    Blue = "blue",
    Indigo = "indigo",
    Violet = "violet",
    Pink = "pink",
    Rose = "rose",
}

export const entryTypeColors: Record<EntryTypeColor, readonly [backgroundColor: string, darkerBackgroundColor: string, textColor: string]> = Object.freeze({
    // [overall background color, darker left rectangle color, text color]
    // These colors come from https://tailwindcss.com/docs/customizing-colors and are typically the
    // [color-100, color-200, and color-800] variants from that pallete
    [EntryTypeColor.Slate]: ["#F1F5F9", "#CBD5E1", "#0F172A"],
    [EntryTypeColor.Red]: ["#FECACA", "#FCA5A5", "#991B1B"],
    [EntryTypeColor.Orange]: ["#FFEDD5", "#FED7AA", "#9A3412"],
    [EntryTypeColor.Yellow]: ["#FEF9C3", "#FEF08A", "#A16207"],
    [EntryTypeColor.Lime]: ["#ECFCCB", "#D9F99D", "#3F6212"],
    [EntryTypeColor.Emerald]: ["#D1FAE5", "#A7F3D0", "##065F46"],
    [EntryTypeColor.Teal]: ["#CCFBF1", "#99f6e4", "#115E59"],
    [EntryTypeColor.Cyan]: ["#CFFAFE", "#A5F3FC", "#155E75"],
    [EntryTypeColor.Blue]: ["#DBEAFE", "#BFDBFE", "#3730A3"],
    [EntryTypeColor.Indigo]: ["#E0E7FF", "#C7D2FE", "#3730A3"],
    [EntryTypeColor.Violet]: ["#EDE9FE", "#DDD6FE", "#5B21B6"],
    [EntryTypeColor.Pink]: ["#FCE7F3", "#FBCFE8", "#9D174D"],
    [EntryTypeColor.Rose]: ["#FFE4E6", "#FECDD3", "#9F1239"],
});


export const EntryTypeSchema = Schema({
    id: vnidString,
    /** Name of this entry type, e.g. "Note", "Task", "Contact", "License", etc. Doesn't need to be unique. */
    name: string,
    description: string,
    /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
    friendlyIdPrefix: string,
    /** Color to represent this entry type */
    color: Schema.enum(EntryTypeColor),
    /** One or two letters used to represent this entry as an abbreviation */
    abbreviation: string.min(0).max(2),

    enabledFeatures: Schema({
        Article: Schema({
        }).strictOptional(),
        Files: Schema({
        }).strictOptional(),
        Image: Schema({
        }).strictOptional(),
        HeroImage: Schema({
            lookupExpression: string,
        }).strictOptional(),
    }),
});
export type EntryTypeData = Type<typeof EntryTypeSchema>;


export enum PropertyType {
    /**
     * A regular value (e.g. a date, a string, a boolean); the value is anything other than another entry.
     */
    Value = "VALUE",
    /**
     * This property represents an IS A relationship (is subclass of, is instance of, is child of, is variant of,
     * is version of).
     *
     * e.g. An Apple IS_A Fruit, Barack Obama IS A President
     */
    RelIsA = "IS_A",
    /**
     * This property represents any other explicitly defined relationship.
     *
     * This excludes the inverse of IS A relationships, like "has subtypes" or "has instances", which should be
     * automatically generated using a lookup function and defined as Value properties (not relationships).
     */
    RelOther = "RELATES_TO",
}

export enum PropertyMode {
    /** This property is required. Leaving it blank will be highlighted as an error. */
    Required = "REQ",
    /**
     * This property is recommended. The "edit" form for this property type will always show a field to add this
     * property.
     */
    Recommended = "REC",
    /**
     * This property is optional. It may be set on the specified entry type, but doesn't necessarily have to be.
     */
    Optional = "OPT",
    /**
     * This property is defined by a lookup expression and its value is derived from other data. It cannot be edited.
     * This can also be used to set a fixed value for all entries of a given type.
     */
    Auto = "AUTO",
}

// export enum PropertyCardinality {
//     /**
//      * This property holds a single value (or none, if not required).
//      * If it's a relationship, it can only point to one entry.
//      */
//     Single = "1",
//     /**
//      * This property can have different values, but they each must be unique.
//      *
//      * This can be used for relationships, or also to express disagreement or uncertainty about other values like
//      * empirical measurements (e.g. bob says the mass is 5.128 but alice says it's 5.208)
//      */
//     Unique = "U",
//     /**
//      * This property can have multiple values, and they don't have to be unique.
//      *
//      * This can be used for example to express that a widget has different parts, each of which is the same but is
//      * used for a different purpose.
//      */
//     Multiple = "*",
// }

export const PropertySchema = Schema({
    id: vnidString,
    /** Name of this property, displayed as the label when viewing an entry with this property value */
    name: string,
    /** Description of this property (markdown) */
    descriptionMD: string,
    /** What type of property is this - a relationship, or some other simple property? (Cannot be changed) */
    type: Schema.enum(PropertyType),
    /** What EntryTypes can have this property? */
    appliesTo: array.of(Schema({
        entryType: vnidString,
    })),
    /** Is this a property that can be set manually? Or MUST be set? Or is it computed automatically? */
    mode: Schema.enum(PropertyMode).strictOptional(),
    /**
     * A lookup expression (usually an "x expression") that defines what values are allowed.
     * This property is ignored if mode is "Auto".
     */
    valueConstraint: string.strictOptional(),
    /** This property is a sub-type of some other property (e.g. "average voltage" is a type of "voltage") */
    isA: array.of(vnidString).strictOptional(),
    /**
     * The default value for this property. If a default is set, all entries of the given type will show this property
     * with the default value, unless it is overridden.
     *
     * If mode is Auto, this is required, because there is nowhere else to set the value.
     *
     * This can be a lookup expression.
     */
    default: string.strictOptional(),
    /** Should this property value inherit to child entries? */
    inheritable: boolean.strictOptional(),
    /** Enable the "slots" feature, which allows partial overriding of inherited values, useful for "Has Type" relationships */
    enableSlots: boolean.strictOptional(),
    /** The standard URL for this property, e.g. "https://schema.org/birthDate" for "date of birth" */
    standardURL: string.strictOptional(),
    /** The Wikidata P ID for this property, if applicable, e.g. P569 for "date of birth" */
    //wikidataPID: string.strictOptional(),
    /**
     * Default rank of this property, 0 being most important, 99 being least.
     * Only properties with rank < 50 are shown on entry pages by default, while higher ranks (less important)
     * properties are put onto a "see more" page.
     */
    rank: number,
    /**
     * Markdown template for formatting this value in a particular way.
     * e.g. use `[{value}](https://www.wikidata.org/wiki/{value})` to format a Wikidata Q ID as a link.
     */
    displayAs: string.strictOptional(),
    // TODO: get rid of "displayAs", replace it with "transformEachForDisplay" and "transformAllForDisplay"
    /** Text shown to users when they go to edit this property value. */
    editNoteMD: string.strictOptional(),
    // TODO: hasSlot, hasWeight, hasSource
});
export type PropertyData = Type<typeof PropertySchema>;

export const SiteSchemaSchema = Schema({
    entryTypes: Record(string, EntryTypeSchema),
    properties: Record(string, PropertySchema),
});

/**
 * A complete specification of the schema of a neolace site.
 */
export interface SiteSchemaData {
    entryTypes: {[id: string]: EntryTypeData};
    properties: {[id: string]: PropertyData};
}
// This also works but is a bit verbose because it doesn't use our named interfaces:
//export type SiteSchemaData = Type<typeof SiteSchemaSchema>;
