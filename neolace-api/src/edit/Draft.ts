import { Schema, Type, string, vnidString, nullable, array, DateType, object, } from "../api-schemas.ts";
import { EditChangeType } from "./Edit.ts";

export enum DraftStatus {
    Open = 0,
    Accepted = 1,
    Cancelled = 2,
}

// Parameters used when creating a new draft
export const CreateDraftSchema = Schema({
    title: string,
    description: nullable(string),
    edits: array.of(Schema({code: string, data: object})),
});

// Information about one of the edits in a draft
export const DraftEditSchema = Schema({
    id: vnidString,
    code: string,
    changeType: Schema.enum(EditChangeType),
    data: object.strictOptional(),
    timestamp: DateType,
});
export type DraftEditData = Type<typeof DraftEditSchema>;

export const DraftSchema = Schema({
    id: vnidString,
    author: Schema({username: string, fullName: nullable(string)}),
    title: string,
    description: nullable(string),
    status: Schema.enum(DraftStatus),
    created: DateType,
    edits: array.of(DraftEditSchema).strictOptional(),
});
export type DraftData = Type<typeof DraftSchema>;
