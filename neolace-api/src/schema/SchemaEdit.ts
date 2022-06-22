// deno-lint-ignore-file no-explicit-any
import { nullable, vnidString, Schema, string, array, Type, number } from "../api-schemas.ts";
import { boolean, SchemaValidatorFunction } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "../edit/Edit.ts";
import { SiteSchemaData, PropertyType, PropertyMode, EntryTypeColor } from "./SiteSchemaData.ts";

export interface SchemaEditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Schema;
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

        if (data.id in currentSchema.entryTypes) {
            throw new Error(`ID ${data.id} is already in this schema.`);
        }

        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: {
                ...currentSchema.entryTypes,
                [data.id]: {
                    id: data.id,
                    name: data.name,
                    description: null,
                    friendlyIdPrefix: null,
                    enabledFeatures: {},
                    color: EntryTypeColor.Default,
                    abbreviation: "",
                },
            },
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
        color: Schema.enum(EntryTypeColor).strictOptional(),
        abbreviation: string.min(0).max(2).strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: {...currentSchema.entryTypes},
        };
        const originalEntryType = newSchema.entryTypes[data.id];
        if (originalEntryType === undefined) {
            throw new Error(`EntryType with ID ${data.id} not found.`);
        }
        const newEntryType = {...originalEntryType};

        for (const key of ["name", "description", "friendlyIdPrefix", "color", "abbreviation"] as const) {
            if (data[key] !== undefined) {
                newEntryType[key] = (data as any)[key];
            }
        }

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
                featureType: Schema.either("Article" as const, "Files" as const, "Image" as const, "HeroImage" as const),
                enabled: false as const,
            },
            {
                featureType: "Article" as const,
                enabled: true as const,
                config: Schema({}),
            },
            {
                featureType: "Files" as const,
                enabled: true as const,
                config: Schema({}),
            },
            {
                featureType: "Image" as const,
                enabled: true as const,
                config: Schema({}),
            },
            {
                featureType: "HeroImage" as const,
                enabled: true as const,
                config: Schema({
                    lookupExpression: string,
                }),
            }
        ),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: {...currentSchema.entryTypes},
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

export const UpdateProperty = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateProperty",
    dataSchema: Schema({
        id: vnidString,
        // For these properties, use 'undefined' to mean 'no change':
        name: string.strictOptional(),
        descriptionMD: string.strictOptional(),
        appliesTo: array.of(Schema({ entryType: vnidString })).strictOptional(),
        mode: Schema.enum(PropertyMode).strictOptional(),
        isA: array.of(vnidString).strictOptional(),
        importance: number.strictOptional(),
        enableSlots: boolean.strictOptional(),
        // For these properties, use 'undefined' to mean 'no change', and an empty string to mean "set to no value"
        valueConstraint: string.strictOptional(),
        default: string.strictOptional(),
        inheritable: boolean.strictOptional(),
        standardURL: string.strictOptional(),
        displayAs: string.strictOptional(),
        editNoteMD: string.strictOptional(),
    }),
    apply: (currentSchema, data) => {

        const currentValues = currentSchema.properties[data.id];
        if (currentValues === undefined) {
            throw new Error(`Property with ID ${data.id} not found.`);
        }

        const newProp = {...currentValues};

        if (data.appliesTo !== undefined) {
            data.appliesTo.forEach(({entryType}) => {
                if (currentSchema.entryTypes[entryType] === undefined) {
                    throw new Error(`No such entry type with ID ${entryType}`);
                }
            })
            newProp.appliesTo = data.appliesTo;
        }

        for (const field of ["name", "descriptionMD", "mode", "isA", "importance"] as const) {
            if (data[field] !== undefined) {
                (newProp as any)[field] = data[field];
            }
        }

        // Booleans
        for (const field of ["inheritable", "enableSlots"] as const) {
            if (data[field] !== undefined) {
                (newProp as any)[field] = data[field];
            }
        }

        for (const field of ["valueConstraint", "default", "standardURL", "editNoteMD", "displayAs"] as const) {
            if (data[field] !== undefined) {
                if (data[field] === "") {
                    newProp[field] = undefined;
                } else {
                    newProp[field] = data[field];
                }
            }
        }

        const newSchema: SiteSchemaData = {
            ...currentSchema,
            properties: {...currentSchema.properties, [data.id]: newProp},
        };
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated \`Property ${data.id}\``,
});

export const CreateProperty = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateProperty",
    // Schema.merge() isn't working so this is largely duplicated from UpdateProperty :/
    dataSchema: Schema({
        id: vnidString,
        name: string,
        type: Schema.enum(PropertyType).strictOptional(),
        descriptionMD: string.strictOptional(),
        appliesTo: array.of(Schema({ entryType: vnidString })).strictOptional(),
        mode: Schema.enum(PropertyMode).strictOptional(),
        isA: array.of(vnidString).strictOptional(),
        importance: number.strictOptional(),
        enableSlots: boolean.strictOptional(),
        // For these properties, use 'undefined' to mean 'use default', and an empty string to mean "set to no value"
        valueConstraint: string.strictOptional(),
        default: string.strictOptional(),
        inheritable: boolean.strictOptional(),
        standardURL: string.strictOptional(),
        displayAs: string.strictOptional(),
        editNoteMD: string.strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            properties: {...currentSchema.properties, [data.id]: {
                id: data.id,
                appliesTo: [],
                descriptionMD: "",
                name: "New Property",
                type: data.type ?? PropertyType.Value,
                mode: PropertyMode.Optional,
                // Default importance is 15
                importance: 15,
                inheritable: data.inheritable ?? false,
                enableSlots: data.enableSlots ?? false,
            }},
        };
        return UpdateProperty.apply(newSchema, data);
    },
    describe: (data) => `Created \`Property ${data.id}\``,
});


export const _allSchemaEditTypes = {
    CreateEntryType,
    UpdateEntryType,
    UpdateEntryTypeFeature,
    UpdateProperty,
    CreateProperty,
};

export type AnySchemaEdit = (
    | Edit<typeof CreateEntryType>
    | Edit<typeof UpdateEntryType>
    | Edit<typeof UpdateEntryTypeFeature>
    | Edit<typeof UpdateProperty>
    | Edit<typeof CreateProperty>
);
