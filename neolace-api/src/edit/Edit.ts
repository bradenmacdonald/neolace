// deno-lint-ignore-file no-explicit-any
import { Type, SchemaValidatorFunction } from "../deps/computed-types.ts";

export enum EditChangeType {
    Schema = "schema",
    Content = "content",
}

export interface EditType<Code extends string = string, DataSchema extends SchemaValidatorFunction<any> = SchemaValidatorFunction<any>> {
    changeType: EditChangeType;
    // A string that specifies what edit is being made
    code: Code;
    dataSchema: DataSchema;
    describe: (data: Type<DataSchema>) => string;
    consolidate?: (thisEdit: Edit<EditType<string, DataSchema>>, earlierEdit: Edit<EditType<any, any>>) => undefined|Edit<EditType<any, any>>;
}

/* Data structure describing a specific edit */
export type Edit<T extends EditType<string, any>> = {code: T["code"], data: Type<T["dataSchema"]>};
