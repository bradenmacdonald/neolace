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
        friendlyId: string.strictOptional(),
        name: string,
        type: vnidString,
        description: string,
    }),
    describe: (data) => `Created \`Entry ${data.id}\``,
});

export const UpdatePropertyEntry = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdatePropertyEntry",
    dataSchema: Schema({
        id: vnidString,
        /** Change the "importance" of this property. Lower numbers are most important. */
        importance: number.min(0).max(99).strictOptional(),
        // Change the allowed data type for values of this property. Won't affect existing property values.
        valueType: string.strictOptional(),
        /** Should property values of this type be inherited by child entries? */
        inherits: boolean.strictOptional(),
        /** Markdown formatting instructions, e.g. use "**{value}**" to display this value in bold */
        displayAs: nullable(string).strictOptional(),
    }),
    describe: (data) => `Updated Property Features of \`Entry ${data.id}\``,
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
    }),
    describe: (data) => `Created \`RelationshipFact ${data.id}\``,
});

export const UpdatePropertyValue = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdatePropertyValue",
    dataSchema: Schema({
        // The Entry where we are creating/updating/deleting this PropertyFact
        entry: vnidString,
        // The Property in question. Must be the ID of an Entry with ContentType=Property and the schema must allow
        // HAS_PROPERTY relationships from the entry type to that property entry type.
        property: vnidString,
        /** Value expression: a lookup expression giving the value, or an empty string to delete this property */
        valueExpression: string,
        /** An optional markdown note clarifying details of the property value */
        note: string,
    }),
    describe: (data) => `Updated \`Entry ${data.property}\` property on \`Entry ${data.entry}\``,
});

export const _allContentEditTypes = {
    CreateEntry,
    UpdatePropertyEntry,
    CreateRelationshipFact,
    UpdatePropertyValue,
};

export type AnyContentEdit = (
    | Edit<typeof CreateEntry>
    | Edit<typeof UpdatePropertyEntry>
    | Edit<typeof CreateRelationshipFact>
    | Edit<typeof UpdatePropertyValue>
);
