// deno-lint-ignore-file no-explicit-any
import { nullable, vnidString } from "../api-schemas.ts";
import { Schema, SchemaValidatorFunction, string, array, Type } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "../edit/Edit.ts";
import { ContentType, SiteSchemaData, RelationshipCategory, ComputedFactSchema } from "./SiteSchemaData.ts";

interface SchemaEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Schema;
    /**
     * If this edit "expands" the schema, it does something like adding a new Entry Type or a new Property, which are
     * guaranteed to be compatible with the data that came before.
     * If this is false (this edit "contracts" the schema), then it is doing something like deleting an entry type which
     * may break backwards compatibility.
     */
    // expands: boolean;
    apply: (currentSchema: Readonly<SiteSchemaData>, data: Type<DataSchema>) => SiteSchemaData;
}

function SchemaEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(args: SchemaEditType<Code, DataSchema>): SchemaEditType<Code, DataSchema> {
    return args;
}

export const CreateEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateEntryType",
    dataSchema: Schema({
        name: string,
        id: vnidString,
    }),
    apply: (currentSchema, data) => {

        if (data.id in currentSchema.entryTypes || data.id in currentSchema.relationshipTypes) {
            throw new Error(`ID ${data.id} is already in this schema.`);
        }

        const newSchema: SiteSchemaData = {
            entryTypes: {
                ...currentSchema.entryTypes,
                [data.id]: {
                    id: data.id,
                    name: data.name,
                    contentType: ContentType.None,
                    description: null,
                    friendlyIdPrefix: null,
                    computedFacts: [],
                },
            },
            relationshipTypes: currentSchema.relationshipTypes,
        };

        return Object.freeze(newSchema);
    },
    describe: (data) => `Created \`EntryType ${data.id}\``,  // TODO: get withId to accept a second "fallback" parameter so we can pass in "Name" and display that even before the object with this ID is saved into the database.
});

export const UpdateEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateEntryType",
    dataSchema: Schema({
        id: vnidString,
        name: string.strictOptional(),
        contentType: Schema.enum(ContentType).strictOptional(),
        description: nullable(string).strictOptional(),
        friendlyIdPrefix: nullable(string).strictOptional(),
        addOrUpdateComputedFacts: array.of(ComputedFactSchema).strictOptional(),
        removeComputedFacts: array.of(vnidString).strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            entryTypes: {...currentSchema.entryTypes},
            relationshipTypes: currentSchema.relationshipTypes,
        };
        const originalEntryType = newSchema.entryTypes[data.id];
        if (originalEntryType === undefined) {
            throw new Error(`EntryType with ID ${data.id} not found.`);
        }
        const newEntryType = {...originalEntryType};
        newEntryType.computedFacts = [...newEntryType.computedFacts];  // Shallow copy the array so we can modify it

        for (const key of ["name", "contentType", "description", "friendlyIdPrefix"] as const) {
            newEntryType[key] = (data as any)[key];
        }

        data.addOrUpdateComputedFacts?.forEach(newFact => {
            const existingIndex = newEntryType.computedFacts.findIndex(cf => cf.id === newFact.id);
            if (existingIndex !== -1) {
                newEntryType.computedFacts[existingIndex] = newFact;
            } else {
                newEntryType.computedFacts.push(newFact);
            }
        });
        data.removeComputedFacts?.forEach(id => {
            newEntryType.computedFacts = newEntryType.computedFacts.filter(cf => cf.id !== id)
        });
        // Fix the sorting of the "computed facts" array, for consistency (has to match ComputedFact.defaultOrderBy):
        // Sort first by importance (lowest first), then by label (A before B)
        newEntryType.computedFacts.sort((b, a) => (b.importance - a.importance)*1000 + b.label.localeCompare(a.label));

        newSchema.entryTypes[data.id] = newEntryType;
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated \`EntryType ${data.id}\``,
});

export const CreateRelationshipType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateRelationshipType",
    dataSchema: Schema({
        nameForward: string,
        nameReverse: string,
        id: vnidString,
        category: Schema.enum(RelationshipCategory),
    }),
    apply: (currentSchema, data) => {

        if (data.id in currentSchema.entryTypes || data.id in currentSchema.relationshipTypes) {
            throw new Error(`ID ${data.id} is already in this schema.`);
        }

        const newSchema: SiteSchemaData = {
            entryTypes: currentSchema.entryTypes,
            relationshipTypes: {
                ...currentSchema.relationshipTypes,
                [data.id]: {
                    id: data.id,
                    nameForward: data.nameForward,
                    nameReverse: data.nameReverse,
                    category: data.category,
                    description: null,
                    fromEntryTypes: [],
                    toEntryTypes: [],
                },
            },
        };

        return Object.freeze(newSchema);
    },
    describe: (data) => `Created \`RelationshipType ${data.id}\``,  // TODO: get withId to accept a second "fallback" parameter so we can pass in "Name" and display that even before the object with this ID is saved into the database.
});

export const UpdateRelationshipType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateRelationshipType",
    dataSchema: Schema({
        id: vnidString,
        nameForward: string.strictOptional(),
        nameReverse: string.strictOptional(),
        description: nullable(string).strictOptional(),
        addFromTypes: array.of(vnidString).strictOptional(),
        removeFromTypes: array.of(vnidString).strictOptional(),
        addToTypes: array.of(vnidString).strictOptional(),
        removeToTypes: array.of(vnidString).strictOptional(),
    }),
    apply: (currentSchema, data) => {

        const currentValues = currentSchema.relationshipTypes[data.id];
        if (currentValues === undefined) {
            throw new Error(`RelationshipType with ID ${data.id} not found.`);
        }

        const relType = {...currentValues};

        // Updates to the fromEntryTypes field:
        if (data.removeFromTypes) {
            relType.fromEntryTypes = relType.fromEntryTypes.filter(id => !data.removeFromTypes?.includes(id));
        }
        data.addFromTypes?.forEach(entryTypeId => {
            if (!relType.fromEntryTypes.includes(entryTypeId)) {
                relType.fromEntryTypes = [...relType.fromEntryTypes, entryTypeId];
            }
        });

        // Updates to the toEntryTypes field:
        if (data.removeToTypes) {
            relType.toEntryTypes = relType.toEntryTypes.filter(id => !data.removeToTypes?.includes(id));
        }
        data.addToTypes?.forEach(entryTypeId => {
            if (!relType.toEntryTypes.includes(entryTypeId)) {
                relType.toEntryTypes = [...relType.toEntryTypes, entryTypeId];
            }
        });

        // Updates to other fields:
        for (const key of ["nameForward", "nameReverse", "description"] as const) {
            if (data[key] !== undefined) {
                relType[key] = (data)[key] as any;
            }
        }

        const newSchema: SiteSchemaData = {
            entryTypes: currentSchema.entryTypes,
            relationshipTypes: {...currentSchema.relationshipTypes, [data.id]: relType},
        };
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated \`RelationshipType ${data.id}\``,
});


export const _allSchemaEditTypes = {
    CreateEntryType,
    UpdateEntryType,
    CreateRelationshipType,
    UpdateRelationshipType,
};

export type AnySchemaEdit = (
    | Edit<typeof CreateEntryType>
    | Edit<typeof UpdateEntryType>
    | Edit<typeof CreateRelationshipType>
    | Edit<typeof UpdateRelationshipType>
);
