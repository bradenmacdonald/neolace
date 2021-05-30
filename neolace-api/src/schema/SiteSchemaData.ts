declare type NominalType<T, K extends string> = T & {nominal: K;};  // Nominal type, compatible with Vertex Framework
export declare type VNID = NominalType<string, "VNID">;  // Same definition as in Vertex Framework

export enum ContentType {
    /** Just a normal entry, with name, description, properties, relationships, but no "content" */
    None = "None",
    /** A rich text article, consisting of "blocks" which may be rich text, images, interactives, charts, and more */
    Article = "Article",
    // Future: Image, File, DataTable
}

export function CastContentType(value: string): ContentType {
    if (!Object.values(ContentType).includes(value as ContentType)) {
        throw new Error(`Invalid ContentType: ${value}`);
    }
    return value as ContentType;
}

export interface EntryTypeData {
    id: VNID;
    /** Name of this entry type, e.g. "Note", "Task", "Contact", "License", etc. Doesn't need to be unique. */
    name: string;
    /** Does this entry have a special type of content? e.g. is there an attached article or image? */
    contentType: ContentType;
    description: string|null;
    /** FriendlyId prefix for entries of this type; if NULL then FriendlyIds are not used. */
    friendlyIdPrefix: string|null;
}


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
    DEPENDS_ON = "DEPENDS_ON",
    /**
     * RELATES_TO: e.g. An Email RELATES_TO a SubjectMatter
     * This is considered a symmetrical relationship.
     */
    RELATES_TO = "RELATES_TO",
}

export function CastRelationshipCategory(value: string): RelationshipCategory {
    if (!Object.values(RelationshipCategory).includes(value as RelationshipCategory)) {
        throw new Error(`Invalid RelationshipCategory: ${value}`);
    }
    return value as RelationshipCategory;
}

export interface RelationshipTypeData {
    id: VNID;
    /** Name of this relationship type */
    name: string;
    category: RelationshipCategory;
}


/**
 * A complete specification of the schema of a neolace site.
 */
export interface SiteSchemaData {
    entryTypes: {[id: string]: EntryTypeData};
    // TODO: properties
    relationshipTypes: {[id: string]: RelationshipTypeData};
}
