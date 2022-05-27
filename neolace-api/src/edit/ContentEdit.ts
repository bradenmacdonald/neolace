// deno-lint-ignore-file no-explicit-any
import { vnidString, } from "../api-schemas.ts";
import { EditableEntryData, ImageSizingMode } from "../content/Entry.ts";
import { number, Schema, SchemaValidatorFunction, string, Type } from "../deps/computed-types.ts";
import { type SiteSchemaData } from "../schema/SiteSchemaData.ts";
import { Edit, EditChangeType, EditType } from "./Edit.ts";

export interface ContentEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Content;
    apply: (currentEntry: Readonly<EditableEntryData>, data: Type<DataSchema>, currentSchema: SiteSchemaData) => EditableEntryData;
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
    apply: (baseEntry, data, currentSchema) => {
        if (baseEntry.id === data.id) {
            return {
                ...baseEntry,
                name: data.name,
                friendlyId: data.friendlyId,
                description: data.description,
                entryType: { id: data.type, name: currentSchema.entryTypes[data.type]?.name ?? "Unknown Entry Type" },
                features: {},
                propertiesRaw: [],
            };
        }
        return baseEntry;
    },
    describe: (data) => `Created \`Entry ${data.id}\` "${data.name}"`,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.id === thisEdit.data.id) {
            // There can only be one "Create Entry" for each entry, and the latest one wins.
            return thisEdit;
        } else if (earlierEdit.data.entryId === thisEdit.data.id) {
            // Some other edit took place before this entry was even created? Overwrite that with this.
            return thisEdit;
        }
        return undefined;
    },
});

export const SetEntryName = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryName",
    dataSchema: Schema({ entryId: vnidString, name: string, }),
    apply: (baseEntry, data) => {
        const updatedEntry = {...baseEntry}
        if (baseEntry.id === data.entryId) {
            updatedEntry.name = data.name;
        }
        return updatedEntry;
    },
    describe: (data) => `Renamed \`Entry ${data.entryId}\` to "${data.name}"`,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // This rename overwrites the previous rename.
            return thisEdit;
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.id === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this name
            return {code: CreateEntry.code, data: {...earlierEdit.data, name: thisEdit.data.name}};
        }
        return undefined;
    },
});

export const SetEntryFriendlyId = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryFriendlyId",
    dataSchema: Schema({ entryId: vnidString, friendlyId: string, }),
    apply: (baseEntry, data) => {
        const updatedEntry = {...baseEntry}
        if (baseEntry.id === data.entryId) {
            updatedEntry.friendlyId = data.friendlyId;
        }
        return updatedEntry;
    },
    describe: (data) => `Change \`Entry ${data.entryId}\` ID to "${data.friendlyId}"`,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // This rename overwrites the previous ID change.
            return thisEdit;
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.id === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this ID
            return {code: CreateEntry.code, data: {...earlierEdit.data, friendlyId: thisEdit.data.friendlyId}};
        }
        return undefined;
    },
});

export const SetEntryDescription = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryDescription",
    dataSchema: Schema({ entryId: vnidString, description: string, }),
    apply: (baseEntry, data) => {
        const updatedEntry = {...baseEntry}
        if (baseEntry.id === data.entryId) {
            updatedEntry.description = data.description;
        }
        return updatedEntry;
    },
    describe: (data) => `Edited description of \`Entry ${data.entryId}\``,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // This rename overwrites the previous description edit.
            return thisEdit;
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.id === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this ID
            return {code: CreateEntry.code, data: {...earlierEdit.data, description: thisEdit.data.description}};
        }
        return undefined;
    },
});

export const UpdateEntryArticleSchema = Schema({
    /** Replace the entire article text with this new text */
    articleMD: string.strictOptional(),
});

export const UpdateEntryFilesSchema = Schema({
    changeType: Schema.either("addFile" as const, "removeFile" as const),
    /**
     * filename, e.g. "instructions.pdf".
     * When adding, this specified the filename. When removing, will remove any attached file(s) with this name
     */
    filename: string,
    /** When adding a new file, specify its upload ID here. */
    draftFileId: vnidString.strictOptional(),
});

export const UpdateEntryImageSchema = Schema({
    /** Change which actual image file this entry "holds" */
    draftFileId: vnidString.strictOptional(),
    /** Set the sizing mode */
    setSizing: Schema.enum(ImageSizingMode).strictOptional(),
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
                {featureType: "Files" as const},
                UpdateEntryFilesSchema,
            ),
            Schema.merge(
                {featureType: "Image" as const},
                UpdateEntryImageSchema,
            ),
            // "HeroImage" feature is not edited directly on individual entries; a lookup expression determines how
            // the hero image is calculated for each entry, usually based on a relationship or property
        ),
    }),
    apply: () => {
        throw new Error("This edit type is not implemented yet.");
    },
    describe: (data) => `Updated ${data.feature.featureType} Feature of \`Entry ${data.entryId}\``,
});

export const AddPropertyValue = ContentEditType({
    changeType: EditChangeType.Content,
    code: "AddPropertyValue",
    dataSchema: Schema({
        /** The Entry where we are adding a new property value */
        entry: vnidString,
        /** The Property in question. */
        property: vnidString,
        /** The ID of this new property fact */
        propertyFactId: vnidString,
        /** Value expression: a lookup expression giving the value */
        valueExpression: string,
        /** An optional markdown note clarifying details of the property value */
        note: string,
        /** Rank determines the order in which values are listed if there are multiple values for one property */
        rank: number.strictOptional(),
        /**
         * If the property enables "slots", this can be used to selectively override inherited values (only values with
         * the same slot get overridden).
         */
        slot: string.strictOptional(),
    }),
    apply: () => {
        throw new Error("This edit type is not implemented yet.");
    },
    describe: (data) => `Added value for \`Property ${data.property}\` property on \`Entry ${data.entry}\``,
});

export const UpdatePropertyValue = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdatePropertyValue",
    dataSchema: Schema({
        /** The ID of the property fact to change */
        propertyFactId: vnidString,
        /** Value expression: a lookup expression giving the new value */
        valueExpression: string,
        /** An optional markdown note clarifying details of the property value */
        note: string,
        /** Change the rank of this property */
        rank: number.strictOptional(),
        /**
         * If the property enables "slots", this can be used to selectively override inherited values (only values with
         * the same slot get overridden).
         */
        slot: string.strictOptional(),
    }),
    apply: () => {
        throw new Error("This edit type is not implemented yet.");
    },
    describe: (data) => `Updated \`PropertyFact ${data.propertyFactId}\` property value`,
});

export const DeletePropertyValue = ContentEditType({
    changeType: EditChangeType.Content,
    code: "DeletePropertyValue",
    dataSchema: Schema({
        /** The ID of the property fact to change */
        propertyFactId: vnidString,
    }),
    apply: () => {
        throw new Error("This edit type is not implemented yet.");
    },
    describe: (data) => `Deleted \`PropertyFact ${data.propertyFactId}\` property value`,
});

export const _allContentEditTypes = {
    CreateEntry,
    SetEntryName,
    SetEntryFriendlyId,
    SetEntryDescription,
    UpdateEntryFeature,
    AddPropertyValue,
    UpdatePropertyValue,
    DeletePropertyValue,
};

export type AnyContentEdit = (
    | Edit<typeof CreateEntry>
    | Edit<typeof SetEntryName>
    | Edit<typeof SetEntryFriendlyId>
    | Edit<typeof SetEntryDescription>
    | Edit<typeof UpdateEntryFeature>
    | Edit<typeof AddPropertyValue>
    | Edit<typeof UpdatePropertyValue>
    | Edit<typeof DeletePropertyValue>
);
