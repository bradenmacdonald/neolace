// deno-lint-ignore-file no-explicit-any
import { array, number, Schema, string, Type } from "../api-schemas.ts";
import { boolean, SchemaValidatorFunction } from "../deps/computed-types.ts";
import { Edit, EditChangeType, EditType } from "../edit/Edit.ts";
import { EntryTypeColor, PropertyMode, PropertyType, SiteSchemaData } from "./SiteSchemaData.ts";

export interface SchemaEditType<
    Code extends string = string,
    DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>,
> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Schema;
    apply: (currentSchema: Readonly<SiteSchemaData>, data: Type<DataSchema>) => SiteSchemaData;
}

function SchemaEditType<Code extends string, DataSchema extends SchemaValidatorFunction<any>>(
    args: SchemaEditType<Code, DataSchema>,
): SchemaEditType<Code, DataSchema> {
    return args;
}

export const CreateEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateEntryType",
    dataSchema: Schema({
        name: string,
        /** The new key of this EntryType */
        key: string,
    }),
    apply: (currentSchema, data) => {
        if (data.key in currentSchema.entryTypes) {
            throw new Error(`ID ${data.key} is already in this schema.`);
        }

        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: {
                ...currentSchema.entryTypes,
                [data.key]: {
                    key: data.key,
                    name: data.name,
                    description: "",
                    keyPrefix: "",
                    enabledFeatures: {},
                    color: EntryTypeColor.Default,
                    abbreviation: "",
                },
            },
        };

        return Object.freeze(newSchema);
    },
    describe: (data) => `Created EntryType ${data.key} ("${data.name}")`,
});

export const UpdateEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateEntryType",
    dataSchema: Schema({
        key: string,
        name: string.strictOptional(),
        description: string.strictOptional(),
        keyPrefix: string.strictOptional(),
        color: Schema.enum(EntryTypeColor).strictOptional(),
        colorCustom: string.strictOptional(),
        abbreviation: string.min(0).max(2).strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: { ...currentSchema.entryTypes },
        };
        const originalEntryType = newSchema.entryTypes[data.key];
        if (originalEntryType === undefined) {
            throw new Error(`EntryType with key ${data.key} not found.`);
        }
        const newEntryType = { ...originalEntryType };

        for (const key of ["name", "description", "keyPrefix", "color", "abbreviation"] as const) {
            if (data[key] !== undefined) {
                newEntryType[key] = (data as any)[key];
            }
        }

        newSchema.entryTypes[data.key] = newEntryType;
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated EntryType ${data.key}`,
    consolidate: (thisEdit, earlierEdit) => {
        if (
            earlierEdit.code === "UpdateEntryType" &&
            thisEdit.data.key === earlierEdit.data.key
        ) {
            return {
                code: "UpdateEntryType",
                data: { ...earlierEdit.data, ...thisEdit.data },
            };
        } else if (
            earlierEdit.code === CreateEntryType.code &&
            thisEdit.data.key === earlierEdit.data.key &&
            thisEdit.data.name !== undefined
        ) {
            // If an entry type was created and then later its name was changed, put the final name into the CreateEntryType edit.
            const { name, key, ...otherUpdates } = thisEdit.data;
            const newCreateEdit = { code: CreateEntryType.code, data: { key: earlierEdit.data.key, name } };
            if (Object.keys(otherUpdates).length > 0) {
                // Move the change to "name" into the CreateEntryType edit, and keep the other changes in this edit:
                return [newCreateEdit, { code: "UpdateEntryType", data: { key, ...otherUpdates } }];
            } else {
                return newCreateEdit; // We can delete this UpdateEntryType since it only changed the name, which is now reflected in the CreateEntryType
            }
        }
        return undefined;
    },
});

/**
 * Enable and configure an Entry Type Feature, or disable a feature
 */
export const UpdateEntryTypeFeature = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateEntryTypeFeature",
    dataSchema: Schema({
        entryTypeKey: string,
        feature: Schema.either(
            {
                featureType: Schema.either(
                    "Article" as const,
                    "Files" as const,
                    "Image" as const,
                    "HeroImage" as const,
                ),
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
            },
        ),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: { ...currentSchema.entryTypes },
        };
        const originalEntryType = newSchema.entryTypes[data.entryTypeKey];
        if (originalEntryType === undefined) {
            throw new Error(`EntryType with ID ${data.entryTypeKey} not found.`);
        }
        const newEntryType = { ...originalEntryType };
        newEntryType.enabledFeatures = { ...newEntryType.enabledFeatures }; // Shallow copy the object so we can modify it

        if (data.feature.enabled) {
            const feature = data.feature;
            (newEntryType.enabledFeatures as any)[feature.featureType] = feature.config;
        } else {
            delete newEntryType.enabledFeatures[data.feature.featureType];
        }

        newSchema.entryTypes[data.entryTypeKey] = newEntryType;
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated ${data.feature.featureType} feature of \`EntryType ${data.entryTypeKey}\``,
    consolidate: (thisEdit, earlierEdit) => {
        if (
            earlierEdit.code === "UpdateEntryTypeFeature" &&
            thisEdit.data.entryTypeKey === earlierEdit.data.entryTypeKey &&
            thisEdit.data.feature.featureType === earlierEdit.data.feature.featureType
        ) {
            // The new edit for the same feature always overrides the old, as it's always a complete specification
            // of the feature settings.
            return thisEdit;
        }
        return undefined;
    },
});

export const DeleteEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "DeleteEntryType",
    dataSchema: Schema({
        entryTypeKey: string,
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            entryTypes: { ...currentSchema.entryTypes },
        };
        delete newSchema.entryTypes[data.entryTypeKey];

        return Object.freeze(newSchema);
    },
    describe: (data) => `Deleted \`EntryType ${data.entryTypeKey}\``,
});

export const UpdateProperty = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "UpdateProperty",
    dataSchema: Schema({
        key: string,
        // For these properties, use 'undefined' to mean 'no change':
        name: string.strictOptional(),
        description: string.strictOptional(),
        appliesTo: array.of(Schema({ entryTypeKey: string })).strictOptional(),
        mode: Schema.enum(PropertyMode).strictOptional(),
        isA: array.of(string).strictOptional(),
        rank: number.strictOptional(),
        enableSlots: boolean.strictOptional(),
        // For these properties, use 'undefined' to mean 'no change', and an empty string to mean "set to no value"
        valueConstraint: string.strictOptional(),
        default: string.strictOptional(),
        inheritable: boolean.strictOptional(),
        standardURL: string.strictOptional(),
        displayAs: string.strictOptional(),
        editNote: string.strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const currentValues = currentSchema.properties[data.key];
        if (currentValues === undefined) {
            throw new Error(`Property with ID ${data.key} not found.`);
        }

        const newProp = { ...currentValues };

        if (data.appliesTo !== undefined) {
            data.appliesTo.forEach(({ entryTypeKey }) => {
                if (currentSchema.entryTypes[entryTypeKey] === undefined) {
                    throw new Error(`No such entry type with key ${entryTypeKey}`);
                }
            });
            newProp.appliesTo = data.appliesTo;
        }

        for (const field of ["name", "description", "mode", "isA", "rank"] as const) {
            if (data[field] !== undefined) {
                (newProp as any)[field] = data[field];
            }
        }

        // Booleans
        for (const field of ["inheritable", "enableSlots"] as const) {
            const value = data[field];
            if (value !== undefined) {
                newProp[field] = value;
            }
        }

        for (const field of ["valueConstraint", "default", "standardURL", "editNote", "displayAs"] as const) {
            const value = data[field];
            if (value !== undefined) {
                if (value === "") {
                    newProp[field] = undefined;
                } else {
                    newProp[field] = value;
                }
            }
        }

        const newSchema: SiteSchemaData = {
            ...currentSchema,
            properties: { ...currentSchema.properties, [data.key]: newProp },
        };
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated Property ${data.key}`,
    consolidate: (thisEdit, earlierEdit) => {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.key === thisEdit.data.key) {
            return {
                code: thisEdit.code,
                data: { ...earlierEdit.data, ...thisEdit.data },
            };
        }
        return undefined;
    },
});

export const CreateProperty = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateProperty",
    // Schema.merge() isn't working so this is largely duplicated from UpdateProperty :/
    dataSchema: Schema({
        key: string,
        name: string,
        type: Schema.enum(PropertyType).strictOptional(),
        description: string.strictOptional(),
        appliesTo: array.of(Schema({ entryTypeKey: string })).strictOptional(),
        mode: Schema.enum(PropertyMode).strictOptional(),
        isA: array.of(string).strictOptional(),
        rank: number.strictOptional(),
        enableSlots: boolean.strictOptional(),
        // For these properties, use 'undefined' to mean 'use default', and an empty string to mean "set to no value"
        valueConstraint: string.strictOptional(),
        default: string.strictOptional(),
        inheritable: boolean.strictOptional(),
        standardURL: string.strictOptional(),
        displayAs: string.strictOptional(),
        editNote: string.strictOptional(),
    }),
    apply: (currentSchema, data) => {
        const newSchema: SiteSchemaData = {
            ...currentSchema,
            properties: {
                ...currentSchema.properties,
                [data.key]: {
                    key: data.key,
                    appliesTo: [],
                    description: "",
                    name: "New Property",
                    type: data.type ?? PropertyType.Value,
                    mode: PropertyMode.Optional,
                    // Default rank is 15
                    rank: 15,
                    inheritable: data.inheritable ?? false,
                    enableSlots: data.enableSlots ?? false,
                },
            },
        };
        return UpdateProperty.apply(newSchema, data);
    },
    describe: (data) => `Created Property ${data.key}`,
    consolidate: (thisEdit, earlierEdit) => {
        if (earlierEdit.code === thisEdit.code && earlierEdit.data.key === thisEdit.data.key) {
            return {
                code: thisEdit.code,
                data: { ...earlierEdit.data, ...thisEdit.data },
            };
        }
        return undefined;
    },
});

export const DeleteProperty = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "DeleteProperty",
    dataSchema: Schema({
        key: string,
    }),
    apply: (currentSchema, data) => {
        const newProperties = { ...currentSchema.properties };
        delete newProperties[data.key];
        const newSchema: SiteSchemaData = { ...currentSchema, properties: newProperties };
        return UpdateProperty.apply(newSchema, data);
    },
    describe: (data) => `Deleted Property ${data.key}`,
});

export const _allSchemaEditTypes = {
    CreateEntryType,
    UpdateEntryType,
    UpdateEntryTypeFeature,
    DeleteEntryType,
    UpdateProperty,
    CreateProperty,
    DeleteProperty,
};

export type AnySchemaEdit =
    | Edit<typeof CreateEntryType>
    | Edit<typeof UpdateEntryType>
    | Edit<typeof UpdateEntryTypeFeature>
    | Edit<typeof DeleteEntryType>
    | Edit<typeof UpdateProperty>
    | Edit<typeof CreateProperty>
    | Edit<typeof DeleteProperty>;
