// deno-lint-ignore-file no-explicit-any
import { _allSchemaEditTypes, AnySchemaEdit, SchemaEditType } from "../schema/SchemaEdit.ts";
import { _allBulkEditTypes, BulkEditType } from "./BulkEdit.ts";
import { _allContentEditTypes, AnyContentEdit, ContentEditType } from "./ContentEdit.ts";
import { EditType } from "./Edit.ts";

export type AnyEdit = AnySchemaEdit | AnyContentEdit;
export type EditList = AnyEdit[];

export function getEditType(code: string): ContentEditType | SchemaEditType | BulkEditType {
    const et = (_allContentEditTypes as any)[code] ?? (_allSchemaEditTypes as any)[code] ??
        (_allBulkEditTypes as any)[code];
    if (et === undefined) {
        throw new Error(`Unknown/unsupported edit code: "${code}"`);
    }
    return et;
}
getEditType.OrNone = function (code: string): EditType | undefined {
    return (_allContentEditTypes as any)[code] ?? (_allSchemaEditTypes as any)[code] ??
        (_allBulkEditTypes as any)[code];
};
