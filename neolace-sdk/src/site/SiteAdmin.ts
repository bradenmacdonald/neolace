import { array, boolean, number, Schema, string, Type, vnidString } from "../api-schemas.ts";

/** When listing the users associated with a given site, each response row contains this information: */
export const SiteUserSummary = Schema({
    username: string,
    fullName: string,
    isBot: boolean,
    /** If this is a bot, which human user is it associated with? */
    ownedBy: Schema({ username: string, fullName: string }).strictOptional(),
    /** The groups that this user is part of. This may be undefined if the current user doesn't have permission to see this information. */
    groups: array.of(Schema({
        id: vnidString,
        name: string,
    })).strictOptional(),
});
export type SiteUserSummaryData = Type<typeof SiteUserSummary>;

/** When listing the groups of a site, each response row contains this information */
export const GroupSummary = Schema({
    id: vnidString,
    name: string,
    numUsers: number,
    parentGroupId: vnidString.strictOptional(),
});
export type GroupSummaryData = Type<typeof GroupSummary>;

/** When viewing details of a group, we get this information: */
export const GroupDetails = Schema.merge(GroupSummary, Schema({
    /** The permissions that users in this group have, serialized as strings. */
    grantStrings: array.of(string),
}));
export type GroupDetailsData = Type<typeof GroupDetails>;

export const CreateGroup = Schema({
    name: string,
    parentGroupId: vnidString.strictOptional(),
    /** The permissions that users in this group have, serialized as strings. */
    grantStrings: array.of(string).strictOptional(),
});
export type CreateGroupData = Type<typeof CreateGroup>;
