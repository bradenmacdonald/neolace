import { Schema, Type, string, vnidString, nullable, array, DateType, object, } from "../api-schemas.ts";
import { EditChangeType } from "./Edit.ts";

export enum DraftStatus {
    Open = 0,
    Accepted = 1,
    Cancelled = 2,
}

/**
 * Parameters used when creating a new draft.
 * 
 * This has nothing to do with the Site's "Schema"; Schema here just means the shape of this data structure, which
 * can be accessed programatically.
 */
export const CreateDraftSchema = Schema({
    title: string,
    description: nullable(string),
    edits: array.of(Schema({code: string, data: object})),
});
export type CreateDraftData = Type<typeof CreateDraftSchema>;

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

/** Data returned when uploading a file to a draft. */
export const DraftFileSchema = Schema({
    draftFileId: vnidString,
});
export type DraftFileData = Type<typeof DraftFileSchema>;
