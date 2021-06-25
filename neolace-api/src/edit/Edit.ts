// deno-lint-ignore-file no-explicit-any
export enum EditChangeType {
    Schema = "schema",
    Content = "content",
}

export interface EditType<Code extends string = string, DataSchema = Record<string, never>> {
    changeType: EditChangeType;
    // A string that specifies what edit is being made
    code: Code;
    dataSchema: DataSchema;
    describe: (data: DataSchema) => string;
}

/* Data structure describing a specific edit */
export type Edit<T extends EditType<string, any>> = {code: T["code"], data: T["dataSchema"]};
