// deno-lint-ignore-file no-explicit-any
import { Edit, EditChangeType, EditType } from "../edit/Edit.ts";
import { VNID } from "../types.ts";
import { ContentType, SiteSchemaData, RelationshipCategory } from "./SiteSchemaData.ts";

const typed: any = undefined;  // Helper for declaring types below, where the value doesn't matter, only the type.


interface SchemaEditType<Code extends string = string, DataSchema = Record<string, never>> extends EditType<Code, DataSchema> {
    changeType: EditChangeType.Schema;
    /**
     * If this edit "expands" the schema, it does something like adding a new Entry Type or a new Property, which are
     * guaranteed to be compatible with the data that came before.
     * If this is false (this edit "contracts" the schema), then it is doing something like deleting an entry type which
     * may break backwards compatibility.
     */
    // expands: boolean;
    apply: (currentSchema: Readonly<SiteSchemaData>, data: DataSchema) => SiteSchemaData;
}

function SchemaEditType<Code extends string, DataSchema>(args: SchemaEditType<Code, DataSchema>): SchemaEditType<Code, DataSchema> {
    return args;
}

export const CreateEntryType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateEntryType",
    dataSchema: typed as {
        name: string,
        id: VNID,
    },
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
    dataSchema: typed as {
        id: VNID,
        name?: string,
        contentType?: ContentType.None,
        description?: string|null,
        friendlyIdPrefix?: string|null,
    },
    apply: (currentSchema, data) => {

        const newSchema: SiteSchemaData = {
            entryTypes: {...currentSchema.entryTypes},
            relationshipTypes: currentSchema.relationshipTypes,
        };
        const currentValues = newSchema.entryTypes[data.id];
        if (currentValues === undefined) {
            throw new Error(`EntryType with ID ${data.id} not found.`);
        }

        const changes: any = {};
        for (const key in data) {
            if (key !== "id") {
                changes[key] = (data as any)[key];
            }
        }
        newSchema.entryTypes[data.id] = {...currentValues, ...changes};
        return Object.freeze(newSchema);
    },
    describe: (data) => `Updated \`EntryType ${data.id}\``,
});

export const CreateRelationshipType = SchemaEditType({
    changeType: EditChangeType.Schema,
    code: "CreateRelationshipType",
    dataSchema: typed as {
        nameForward: string,
        nameReverse: string,
        id: VNID,
        category: RelationshipCategory,
    },
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
    dataSchema: typed as {
        id: VNID,
        nameForward?: string,
        nameReverse?: string,
        description?: string|null,
        addFromTypes?: VNID[],
        removeFromTypes?: VNID[],
        addToTypes?: VNID[],
        removeToTypes?: VNID[],
    },
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


const allEditTypes = {
    CreateEntryType,
    UpdateEntryType,
    CreateRelationshipType,
    UpdateRelationshipType,
};

export function getEditType(code: string): EditType {
    const et = (allEditTypes as any)[code];
    if (et === undefined) {
        throw new Error(`Unknown/unsupported edit code: "${code}"`);
    }
    return et;
}
getEditType.OrNone = function(code: string): EditType|undefined {
    return (allEditTypes as any)[code];
}

export type AnySchemaEdit = (
    | Edit<typeof CreateEntryType>
    | Edit<typeof UpdateEntryType>
    | Edit<typeof CreateRelationshipType>
    | Edit<typeof UpdateRelationshipType>
);
