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


export const EnabledFeature = Schema.either(
    {
        feature: "Property" as const,
        appliesToEntryTypes: array.of(vnidString),
    },
)



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
        UseAsProperty: Schema({
            appliesToEntryTypes: array.of(vnidString),
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
     * RELATES_TO: e.g. An Email RELATES_TO a SubjectMatter
     * This is considered a symmetrical relationship.
     */
    //RELATES_TO = "RELATES_TO",
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


export const SiteSchemaSchema = Schema({
    entryTypes: Record(string, EntryTypeSchema),
    relationshipTypes: Record(string, RelationshipTypeSchema),
});

/**
 * A complete specification of the schema of a neolace site.
 */
export interface SiteSchemaData {
    entryTypes: {[id: string]: EntryTypeData};
    // TODO: properties
    relationshipTypes: {[id: string]: RelationshipTypeData};
}
// This also works but is a bit verbose because it doesn't use our named interfaces:
//export type SiteSchemaData = Type<typeof SiteSchemaSchema>;
