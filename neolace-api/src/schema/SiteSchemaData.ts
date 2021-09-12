import { Schema, Type, string, number, vnidString, nullable, array, Record, } from "../api-schemas.ts";

export enum ContentType {
    /** Just an entry, with name, description, properties, relationships, but no "content" */
    None = "None",
    /** Normal entry: A rich text article, consisting of "blocks" which may be rich text, images, interactives, charts, and more */
    Article = "Article",
    /** Property: This entry type represents "properties" which can be used to define other entries */
    Property  = "Property",
    // Future: Image, File, DataTable
}

export function CastContentType(value: string): ContentType {
    if (!Object.values(ContentType).includes(value as ContentType)) {
        throw new Error(`Invalid ContentType: ${value}`);
    }
    return value as ContentType;
}

export const ComputedFactSchema = Schema({
    id: vnidString,
    /** Displayed label of this computed fact, e.g. "Is a type of" */
    label: string,
    expression: string,
    importance: number,
});
export type ComputedFactData = Type<typeof ComputedFactSchema>;


export const EntryTypeSchema = Schema({
    id: vnidString,
    /** Name of this entry type, e.g. "Note", "Task", "Contact", "License", etc. Doesn't need to be unique. */
    name: string,
    /** Does this entry have a special type of content? e.g. is there an attached article or image? */
    contentType: Schema.enum(ContentType),
    description: nullable(string),
    /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
    friendlyIdPrefix: nullable(string),
    /** Computed facts always displayed on entries of this type */
    computedFacts: Record(string, ComputedFactSchema),
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


    /**
     * This type of relationship allows an entry type to be used as "properties"
     *
     * e.g. if you have "Person" EntryType and "PersonProperty" EntryType (including things like "BirthDate" Entry),
     * then the schema will have a RelationshipType entry saying that "Person" HAS PROPERTY "PersonProperty"
     * relationships exist.
     *
     * Then a given Person entry can set a "BirthDate" property value
     *
     * For this type of relationship, the "to" EntryType must have EntryType.ContentType = "Property"
     */
    HAS_PROPERTY = "HAS_PROP",
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
