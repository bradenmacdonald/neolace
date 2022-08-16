import { array, boolean, Schema, string, Type, vnidString } from "../api-schemas.ts";

/** When listing the users associated with a given site, each response row contains this information: */
export const SiteUserSummary = Schema({
    username: string,
    fullName: string,
    isBot: boolean,
    /** If this is a bot, which human user is it associated with? */
    ownedBy: Schema({username: string, fullName: string}).strictOptional(),
    /** The groups that this user is part of. This may be undefined if the current user doesn't have permission to see this information. */
    groups: array.of(Schema({
        id: vnidString,
        name: string,
    })).strictOptional(),
});
export type SiteUserSummaryData = Type<typeof SiteUserSummary>;
