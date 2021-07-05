// deno-lint-ignore-file no-explicit-any
import { vnidString } from "../api-schemas.ts";
import { Schema, SchemaValidatorFunction, string } from "../deps/computed-types.ts";
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

export const _allContentEditTypes = {
    CreateEntry,
    CreateRelationshipFact,
};

export type AnyContentEdit = (
    | Edit<typeof CreateEntry>
    | Edit<typeof CreateRelationshipFact>
);
