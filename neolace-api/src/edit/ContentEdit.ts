// deno-lint-ignore-file no-explicit-any
import { nullable, vnidString, } from "../api-schemas.ts";
import { boolean, number, Schema, SchemaValidatorFunction, string } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "./Edit.ts";

interface ContentEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Content;
}

function ContentEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(args: ContentEditType<Code, DataSchema>): ContentEditType<Code, DataSchema> {
    return args;
}

export const CreateEntry = ContentEditType({
    changeType: EditChangeType.Content,
    code: "CreateEntry",
    dataSchema: Schema({
        id: vnidString,
        friendlyId: string,
        name: string,
        type: vnidString,
        description: string,
    }),
    describe: (data) => `Created \`Entry ${data.id}\``,
});

export const UpdateEntryArticleSchema = Schema({
    /** Replace the entire article text with this new text */
    articleMD: string.strictOptional(),
});

/** For a single, specific entry (not an EntryType), update how it can be used as a property for other entries */
export const UpdateEntryUseAsPropertySchema = Schema({
    /** Change the "importance" of this property. Lower numbers are most important. */
    importance: number.min(0).max(99).strictOptional(),
    // Change the allowed data type for values of this property. Won't affect existing property values.
    valueType: string.strictOptional(),
    /** Should property values of this type be inherited by child entries? */
    inherits: boolean.strictOptional(),
    /** Markdown formatting instructions, e.g. use "**{value}**" to display this value in bold */
    displayAs: nullable(string).strictOptional(),
});

export const UpdateEntryImageSchema = Schema({
    /** Change which actual image file this entry "holds" */
    dataFileId: vnidString.strictOptional(),
});

/** Change details of how this entry is used as a property for other entries */
export const UpdateEntryFeature = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdateEntryFeature",
    dataSchema: Schema({
        entryId: vnidString,
        feature: Schema.either(
            Schema.merge(
                {featureType: "Article" as const},
                UpdateEntryArticleSchema,
            ),
            Schema.merge(
                {featureType: "UseAsProperty" as const},
                UpdateEntryUseAsPropertySchema,
            ),
            Schema.merge(
                {featureType: "Image" as const},
                UpdateEntryImageSchema,
            ),
            // "HeroImage" feature is not edited directly on individual entries; a lookup expression determines how
            // the hero image is calculated for each entry, usually based on a relationship or property
        ),
    }),
    describe: (data) => `Updated ${data.feature.featureType} Feature of \`Entry ${data.entryId}\``,
});

export const CreateRelationshipFact = ContentEditType({
    changeType: EditChangeType.Content,
    code: "CreateRelationshipFact",
    dataSchema: Schema({
        // The new ID for this Relationship Fact
        id: vnidString,
        // The RelationshipType for this new relationship
        type: vnidString,
        // The Entry that this relationship is "from", also the entry that will be the "source" of this Relationship Fact
        fromEntry: vnidString,
        // The Entry that this relationship is "to"
        toEntry: vnidString,
        /** A note about this relationship. Displayed as Markdown. */
        noteMD: string.strictOptional(),
    }),
    describe: (data) => `Created \`RelationshipFact ${data.id}\``,
});

export const UpdatePropertyValue = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdatePropertyValue",
    dataSchema: Schema({
        // The Entry where we are creating/updating/deleting this PropertyFact
        entry: vnidString,
        // The Property in question.
        property: vnidString,
        /**
         * A property fact ID must be omitted for properties that only allow a single value or only unique values.
         * A property fact ID is required for properties that allow multiple values (including multiple identical
         * values).
         *
         * In the case of single-cardinality or unique-cardinality properties, we generally don't want to specify the
         * property fact ID here, to reduce the chance of conflicts in different Drafts that are editing the same entry.
         */
        propertyFactId: vnidString.strictOptional(),
        /** Value expression: a lookup expression giving the value */
        valueExpression: string,
        /** An optional markdown note clarifying details of the property value */
        note: string,
    }),
    describe: (data) => `Updated \`Entry ${data.property}\` property on \`Entry ${data.entry}\``,
});

// TODO: Delete property value

export const _allContentEditTypes = {
    CreateEntry,
    UpdateEntryFeature,
    CreateRelationshipFact,
    UpdatePropertyValue,
};

export type AnyContentEdit = (
    | Edit<typeof CreateEntry>
    | Edit<typeof UpdateEntryFeature>
    | Edit<typeof CreateRelationshipFact>
    | Edit<typeof UpdatePropertyValue>
);
