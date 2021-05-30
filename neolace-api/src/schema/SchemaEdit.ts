import { VNID, ContentType, SiteSchemaData, EntryTypeData } from "./SiteSchemaData";

const typed: any = undefined;  // Helper for declaring types below, where the value doesn't matter, only the type.

interface EditType<Code extends string = string, DataSchema = Record<string, never>> {
    changeType: "schema"|"content";
    // A string that specifies what edit is being made
    code: Code;
    dataSchema: DataSchema;
    describe: (data: DataSchema) => string;
}

interface SchemaEditType<Code extends string = string, DataSchema = Record<string, never>> extends EditType<Code, DataSchema> {
    changeType: "schema";
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
    changeType: "schema",
    code: "CreateEntryType",
    dataSchema: typed as {
        name: string,
        id: VNID,
    },
    apply: (currentSchema, data) => {

        if (data.id in currentSchema.entryTypes) {
            throw new Error(`EntryType with ID ${data.id} already in schema.`);
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

        return newSchema;
    },
    describe: (data) => `Created \`EntryType ${data.id}\``,  // TODO: get withId to accept a second "fallback" parameter so we can pass in "Name" and display that even before the object with this ID is saved into the database.
});

export const UpdateEntryType = SchemaEditType({
    changeType: "schema",
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
        return newSchema;
    },
    describe: (data) => `Updated \`EntryType ${data.id}\``,
});


type Edit<T extends EditType<string, any>> = {code: T["code"], data: T["dataSchema"]};

export interface EditSet {
    edits: (
        | Edit<typeof CreateEntryType>
        | Edit<typeof UpdateEntryType>
    )[];
}
