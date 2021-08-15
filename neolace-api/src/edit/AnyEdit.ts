import { _allSchemaEditTypes, AnySchemaEdit } from "../schema/SchemaEdit.ts";
import { _allContentEditTypes, AnyContentEdit } from "./ContentEdit.ts";
import { EditType } from "./Edit.ts";

export type EditList = (AnySchemaEdit|AnyContentEdit)[];

export function getEditType(code: string): EditType {
    // deno-lint-ignore no-explicit-any
    const et = (_allContentEditTypes as any)[code] ?? (_allSchemaEditTypes as any)[code];
    if (et === undefined) {
        throw new Error(`Unknown/unsupported edit code: "${code}"`);
    }
    return et;
}
getEditType.OrNone = function(code: string): EditType|undefined {
    // deno-lint-ignore no-explicit-any
    return (_allContentEditTypes as any)[code] ?? (_allSchemaEditTypes as any)[code];
}
