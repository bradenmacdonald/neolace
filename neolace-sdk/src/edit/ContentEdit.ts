// deno-lint-ignore-file no-explicit-any
import { vnidString } from "../api-schemas.ts";
import { EditableEntryData, ImageSizingMode } from "../content/Entry.ts";
import { number, Schema, SchemaValidatorFunction, string, Type } from "../deps/computed-types.ts";
import { type SiteSchemaData } from "../schema/SiteSchemaData.ts";
import { Edit, EditChangeType, EditType } from "./Edit.ts";
import * as MDT from "../markdown-mdt.ts";

export interface ContentEditType<
    Code extends string = string,
    DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>,
> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Content;
    apply: (
        currentEntry: Readonly<EditableEntryData>,
        data: Type<DataSchema>,
        currentSchema: SiteSchemaData,
    ) => EditableEntryData;
}

function ContentEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(
    args: ContentEditType<Code, DataSchema>,
): ContentEditType<Code, DataSchema> {
    return args;
}

export const CreateEntry = ContentEditType({
    changeType: EditChangeType.Content,
    code: "CreateEntry",
    dataSchema: Schema({
        entryId: vnidString,
        key: string,
        name: string,
        entryTypeKey: string,
        description: string,
    }),
    apply: (baseEntry, data, currentSchema) => {
        if (baseEntry.id === data.entryId) {
            return {
                ...baseEntry,
                name: data.name,
                key: data.key,
                description: data.description,
                entryType: { key: data.entryTypeKey, name: currentSchema.entryTypes[data.entryTypeKey]?.name ?? "Unknown Entry Type" },
                features: {},
                propertiesRaw: [],
            };
        }
        return baseEntry;
    },
    describe: (data) => `Created \`Entry ${data.entryId}\` "${data.name}"`,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // There can only be one "Create Entry" for each entry, and the latest one wins.
            return thisEdit;
        } else if (earlierEdit.data.entryId === thisEdit.data.entryId) {
            // Some other edit took place before this entry was even created? Overwrite that with this.
            return thisEdit;
        }
        return undefined;
    },
});

export const SetEntryName = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryName",
    dataSchema: Schema({ entryId: vnidString, name: string }),
    apply: (baseEntry, data) => {
        const updatedEntry = { ...baseEntry };
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
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this name
            return { code: CreateEntry.code, data: { ...earlierEdit.data, name: thisEdit.data.name } };
        }
        return undefined;
    },
});

export const SetEntryKey = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryKey",
    dataSchema: Schema({ entryId: vnidString, key: string }),
    apply: (baseEntry, data) => {
        const updatedEntry = { ...baseEntry };
        if (baseEntry.id === data.entryId) {
            updatedEntry.key = data.key;
        }
        return updatedEntry;
    },
    describe: (data) => `Changed key of \`Entry ${data.entryId}\` to "${data.key}"`,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // This rename overwrites the previous ID change.
            return thisEdit;
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this ID
            return { code: CreateEntry.code, data: { ...earlierEdit.data, key: thisEdit.data.key } };
        }
        return undefined;
    },
});

export const SetEntryDescription = ContentEditType({
    changeType: EditChangeType.Content,
    code: "SetEntryDescription",
    dataSchema: Schema({ entryId: vnidString, description: string }),
    apply: (baseEntry, data) => {
        const updatedEntry = { ...baseEntry };
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
        } else if (earlierEdit.code === CreateEntry.code && earlierEdit.data.entryId === thisEdit.data.entryId) {
            // Just update the "CreateEntry" to include this ID
            return { code: CreateEntry.code, data: { ...earlierEdit.data, description: thisEdit.data.description } };
        }
        return undefined;
    },
});

export const UpdateEntryArticleSchema = Schema({
    /** Replace the entire article text with this new text */
    articleContent: string.strictOptional(),
});

export const UpdateEntryFilesSchema = Schema({
    changeType: Schema.either("addFile" as const, "removeFile" as const),
    /**
     * filename, e.g. "instructions.pdf".
     * When adding, this specifies the filename. When removing, will remove any attached file(s) with this name
     */
    filename: string,
    /** When adding a new file, specify its upload ID here. */
    tempFileId: vnidString.strictOptional(),
});

export const UpdateEntryImageSchema = Schema({
    /** Change which actual image file this entry "holds" */
    tempFileId: vnidString.strictOptional(),
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
                { featureType: "Article" as const },
                UpdateEntryArticleSchema,
            ),
            Schema.merge(
                { featureType: "Files" as const },
                UpdateEntryFilesSchema,
            ),
            Schema.merge(
                { featureType: "Image" as const },
                UpdateEntryImageSchema,
            ),
            // "HeroImage" feature is not edited directly on individual entries; a lookup expression determines how
            // the hero image is calculated for each entry, usually based on a relationship or property
        ),
    }),
    apply: (baseEntry, data) => {
        if (baseEntry.id !== data.entryId) {
            return baseEntry;
        }
        const updatedEntry = { ...baseEntry, features: {...baseEntry.features} };
        const edit = data.feature;
        if (edit.featureType === "Article") {
            const articleContent = edit.articleContent ?? "";
            const headings: { id: string; title: string }[] = [];
            // Parse the Markdown to extract the headings:
            try {
                const  parsed = MDT.tokenizeMDT(articleContent);
                // Extract the top-level headings from the document, so all API clients can display a consistent table of contents
                for (const node of parsed.children) {
                    if (node.type === "heading" && node.level === 1) {
                        headings.push({
                            title: node.children.map((c) => MDT.renderInlineToPlainText(c)).join(""),
                            id: node.slugId,
                        });
                    }
                }
            } catch {
                // Ignore problems with parsing the headings.
            }
            updatedEntry.features.Article = { articleContent, headings };
            return updatedEntry;
        } else if (edit.featureType === "Files") {
            let files = baseEntry.features.Files?.files ? [...baseEntry.features.Files?.files] : [];
            if (edit.changeType === "removeFile") {
                files = files.filter((f) => f.filename !== edit.filename);
            } else {
                files = files.filter((f) => f.filename !== edit.filename);
                files.push({
                    filename: edit.filename,
                    contentType: "unknown/temp",
                    size: 0,
                    url: "",
                });
            }
            updatedEntry.features.Files = {files};
            return updatedEntry;
        }
        throw new Error(`Editing this feature type (${edit.featureType}) is not implemented yet.`);
    },
    describe: (data) => `Updated ${data.feature.featureType} feature of \`Entry ${data.entryId}\``,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.entryId === thisEdit.data.entryId && earlierEdit.data.feature.featureType === thisEdit.data.feature.featureType) {
            if (thisEdit.data.feature.featureType === "Article") {
                // This "update article content" overwrites the previous change.
                // In the future, we'll support diffs but for now this just overwrites it.
                return thisEdit;
            }
        }
        return undefined;
    },
});

export const AddPropertyFact = ContentEditType({
    changeType: EditChangeType.Content,
    code: "AddPropertyFact",
    dataSchema: Schema({
        /** The Entry where we are adding a new property value */
        entryId: vnidString,
        /** The Property in question. */
        propertyKey: string,
        /** The ID of this new property fact */
        propertyFactId: vnidString,
        /** Value expression: a lookup expression giving the value */
        valueExpression: string,
        /** An optional markdown note clarifying details of the property value */
        note: string.strictOptional(),
        /** Rank determines the order in which values are listed if there are multiple values for one property */
        rank: number.strictOptional(),
        /**
         * If the property enables "slots", this can be used to selectively override inherited values (only values with
         * the same slot get overridden).
         */
        slot: string.strictOptional(),
    }),
    apply: (baseEntry, data) => {
        if (baseEntry.id !== data.entryId) {
            return baseEntry; // This wasn't the entry we're changing.
        }
        const newPropertyFact = {
            id: data.propertyFactId,
            valueExpression: data.valueExpression,
            note: data.note ?? "",
            rank: data.rank ?? 1,
            slot: data.slot ?? "",
        };
        const updatedEntry: EditableEntryData = { ...baseEntry, propertiesRaw: [...baseEntry.propertiesRaw] };
        const propertyIndex = baseEntry.propertiesRaw.findIndex((p) => p.propertyKey === data.propertyKey);
        if (propertyIndex === -1) {
            // We're adding a value for a property that has no values/facts yet:
            updatedEntry.propertiesRaw.push({ propertyKey: data.propertyKey, facts: [newPropertyFact] });
        } else {
            // We're adding an additional value/fact to a property that already has one or more values/facts:
            updatedEntry.propertiesRaw[propertyIndex] = {
                ...updatedEntry.propertiesRaw[propertyIndex],
                facts: [...updatedEntry.propertiesRaw[propertyIndex].facts, newPropertyFact],
            };
        }
        return updatedEntry;
    },
    describe: (data) => `Added value for \`Property ${data.propertyKey}\` property on \`Entry ${data.entryId}\``,
});

export const UpdatePropertyFact = ContentEditType({
    changeType: EditChangeType.Content,
    code: "UpdatePropertyFact",
    dataSchema: Schema({
        /**
         * The ID of the entry this property fact/value is attached to. (This is technically not necessary since it can
         * be derived from the propertyFactId, but it makes a lot of things easier if the entry ID is included here.)
         */
        entryId: vnidString,
        /** The ID of the property fact to change */
        propertyFactId: vnidString,
        /**
         * Value expression: a lookup expression giving the new value
         * Use undefined to not change the value expression.
         */
        valueExpression: string.strictOptional(),
        /**
         * An optional markdown note clarifying details of the property value.
         * Use a blank string for "no slot", and undefined to leave the slot unchanged.
         */
        note: string.strictOptional(),
        /**
         * Change the rank of this property fact. Lower ranks will come first. The first property value has a rank of 1.
         * Changing this property fact's rank will not automatically change the rank of other property facts.
         * Leave undefined to not change the rank.
         */
        rank: number.strictOptional(),
        /**
         * If the property enables "slots", this can be used to selectively override inherited values (only values with
         * the same slot get overridden).
         * Use a blank string for "no slot", and undefined to leave the slot unchanged.
         */
        slot: string.strictOptional(),
    }),
    apply: (baseEntry, data) => {
        const updatedEntry: EditableEntryData = { ...baseEntry, propertiesRaw: [...baseEntry.propertiesRaw] };
        const propertyIndex = baseEntry.propertiesRaw.findIndex((p) =>
            p.facts.map((f) => f.id).includes(data.propertyFactId)
        );
        if (propertyIndex !== -1) {
            const baseFacts = baseEntry.propertiesRaw[propertyIndex].facts;
            const factIndex = baseFacts.findIndex((f) => f.id === data.propertyFactId);
            const newFacts = [...baseFacts];
            newFacts[factIndex] = { ...baseFacts[factIndex] };
            if (data.valueExpression !== undefined) newFacts[factIndex].valueExpression = data.valueExpression;
            if (data.note !== undefined) newFacts[factIndex].note = data.note;
            if (data.rank !== undefined) newFacts[factIndex].rank = data.rank;
            if (data.slot !== undefined) newFacts[factIndex].slot = data.slot;
            updatedEntry.propertiesRaw[propertyIndex].facts = newFacts;
        }
        return updatedEntry;
    },
    describe: (data) => `Updated \`PropertyFact ${data.propertyFactId}\` property value from \`Entry ${data.entryId}\``,
    consolidate(thisEdit, earlierEdit) {
        // This can be consolidated with a previous UpdatePropertyFact or AddPropertyFact edit.
        if (
            (earlierEdit.code === thisEdit.code || earlierEdit.code === AddPropertyFact.code) &&
            earlierEdit.data.propertyFactId === thisEdit.data.propertyFactId
        ) {
            return { code: earlierEdit.code, data: { ...earlierEdit.data, ...thisEdit.data } };
        }
        return undefined;
    },
});

export const DeletePropertyFact = ContentEditType({
    changeType: EditChangeType.Content,
    code: "DeletePropertyFact",
    dataSchema: Schema({
        /**
         * The ID of the entry this property fact/value is attached to. (This is technically not necessary since it can
         * be derived from the propertyFactId, but it makes a lot of things easier if the entry ID is included here.)
         */
        entryId: vnidString,
        /** The ID of the property fact to change */
        propertyFactId: vnidString,
    }),
    apply: (baseEntry, data) => {
        const updatedEntry: EditableEntryData = { ...baseEntry, propertiesRaw: [...baseEntry.propertiesRaw] };
        const propertyIndex = baseEntry.propertiesRaw.findIndex((p) =>
            p.facts.map((f) => f.id).includes(data.propertyFactId)
        );
        if (propertyIndex !== -1) {
            const baseFacts = baseEntry.propertiesRaw[propertyIndex].facts;
            const factIndex = baseFacts.findIndex((f) => f.id === data.propertyFactId);
            const newFacts = [...baseFacts];
            if (factIndex !== -1) {
                newFacts.splice(factIndex, 1);
            }
            updatedEntry.propertiesRaw[propertyIndex].facts = newFacts;
        }
        return updatedEntry;
    },
    describe: (data) => `Deleted \`PropertyFact ${data.propertyFactId}\` from \`Entry ${data.entryId}\``,
    consolidate(thisEdit, earlierEdit) {
        if (
            (earlierEdit.code === UpdatePropertyFact.code) &&
            earlierEdit.data.propertyFactId === thisEdit.data.propertyFactId
        ) {
            // Ignore any updates if the property gets deleted
            return thisEdit;
        }
        if (
            (earlierEdit.code === AddPropertyFact.code) &&
            earlierEdit.data.propertyFactId === thisEdit.data.propertyFactId
        ) {
            // Add + Delete combine to nothing.
            return [];
        }
        return undefined;
    },
});

export const DeleteEntry = ContentEditType({
    changeType: EditChangeType.Content,
    code: "DeleteEntry",
    dataSchema: Schema({
        entryId: vnidString,
    }),
    apply: (baseEntry, data, _currentSchema) => {
        if (baseEntry.id === data.entryId) {
            return {
                ...baseEntry,
                name: "",
                key: "",
                description: "",
                entryType: baseEntry.entryType,
                features: {},
                propertiesRaw: [],
            };
        }
        return baseEntry;
    },
    describe: (data) => `Delete \`Entry ${data.entryId}\``,
    consolidate(thisEdit, earlierEdit) {
        if (earlierEdit.data.entryId === thisEdit.data.entryId) {
            // We don't need any edits that occurred before this entry was deleted.
            return thisEdit;
        }
        return undefined;
    },
});

export const _allContentEditTypes = {
    CreateEntry,
    SetEntryName,
    SetEntryKey,
    SetEntryDescription,
    UpdateEntryFeature,
    AddPropertyFact,
    UpdatePropertyFact,
    DeletePropertyFact,
    DeleteEntry,
};

export type AnyContentEdit =
    | Edit<typeof CreateEntry>
    | Edit<typeof SetEntryName>
    | Edit<typeof SetEntryKey>
    | Edit<typeof SetEntryDescription>
    | Edit<typeof UpdateEntryFeature>
    | Edit<typeof AddPropertyFact>
    | Edit<typeof UpdatePropertyFact>
    | Edit<typeof DeletePropertyFact>
    | Edit<typeof DeleteEntry>;
