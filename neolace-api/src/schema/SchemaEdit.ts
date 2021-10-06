// deno-lint-ignore-file no-explicit-any
import { nullable, vnidString } from "../api-schemas.ts";
import { Schema, SchemaValidatorFunction, string, array, Type } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "../edit/Edit.ts";
import { SiteSchemaData, RelationshipCategory, SimplePropertySchema } from "./SiteSchemaData.ts";

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
                    description: null,
                    friendlyIdPrefix: null,
                    simplePropValues: {},
                    enabledFeatures: {},
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
        description: nullable(string).strictOptional(),
        friendlyIdPrefix: nullable(string).strictOptional(),
        addOrUpdateSimpleProperties: array.of(SimplePropertySchema).strictOptional(),
        removeSimpleProperties: array.of(vnidString).strictOptional(),
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
        newEntryType.simplePropValues = {...newEntryType.simplePropValues};  // Shallow copy the array so we can modify it

        for (const key of ["name", "description", "friendlyIdPrefix"] as const) {
            newEntryType[key] = (data as any)[key];
        }

        data.addOrUpdateSimpleProperties?.forEach(newProp => newEntryType.simplePropValues[newProp.id] = newProp);
        data.removeSimpleProperties?.forEach(id => delete newEntryType.simplePropValues[id]);

        newSchema.entryTypes[data.id] = newEntryType;
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated \`EntryType ${data.id}\``,
});

/**
 * Enable and configure an Entry Type Feature, or disable a feature
 */
export const UpdateEntryTypeFeature = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateEntryTypeFeature",
    dataSchema: Schema({
        entryTypeId: vnidString,
        feature: Schema.either(
        {
            featureType: "UseAsProperty" as const,
            enabled: true as const,
            config: Schema({
                appliesToEntryTypes: array.of(vnidString),
            }),
        }, {
            featureType: "UseAsProperty" as const,
            enabled: false as const,
        },
        {
            featureType: "Image" as const,
            enabled: true as const,
            config: Schema({}),
        }, {
            featureType: "Image" as const,
            enabled: false as const,
        }),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            entryTypes: {...currentSchema.entryTypes},
            relationshipTypes: currentSchema.relationshipTypes,
        };
        const originalEntryType = newSchema.entryTypes[data.entryTypeId];
        if (originalEntryType === undefined) {
            throw new Error(`EntryType with ID ${data.entryTypeId} not found.`);
        }
        const newEntryType = {...originalEntryType};
        newEntryType.enabledFeatures = {...newEntryType.enabledFeatures};  // Shallow copy the object so we can modify it

        if (data.feature.enabled) {
            const feature = data.feature;
            (newEntryType.enabledFeatures as any)[feature.featureType] = feature.config;
        } else {
            delete newEntryType.enabledFeatures[data.feature.featureType];
        }

        newSchema.entryTypes[data.entryTypeId] = newEntryType;
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated ${data.feature.featureType} feature of \`EntryType ${data.entryTypeId}\``,
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
            if (currentSchema.entryTypes[entryTypeId] === undefined) {
                throw new Error(`No entry type exists with ID ${entryTypeId}`);
            }
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
    UpdateEntryTypeFeature,
    CreateRelationshipType,
    UpdateRelationshipType,
};

export type AnySchemaEdit = (
    | Edit<typeof CreateEntryType>
    | Edit<typeof UpdateEntryType>
    | Edit<typeof UpdateEntryTypeFeature>
    | Edit<typeof CreateRelationshipType>
    | Edit<typeof UpdateRelationshipType>
);
