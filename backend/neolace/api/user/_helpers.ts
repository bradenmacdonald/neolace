import { graph, Drash, log, api } from "neolace/api/mod.ts";
import { BotUser, HumanUser, User } from "neolace/core/User.ts";
import { SYSTEM_VNID, VNID, isVNID } from "neolace/deps/vertex-framework.ts";

/**
 * A helper function to get the profile of a specific user.
 *
 * All information returned by this is considered public.
 */
export async function getPublicUserData(usernameOrVNID: string|VNID): Promise<api.schemas.Type<typeof api.schemas.UserDataResponse>> {
    if (usernameOrVNID === "system" || usernameOrVNID === SYSTEM_VNID) {
        // Special case: the "system" user is neither a human nor a bot.
        return {
            isBot: false,
            fullName: "System (Neolace)",
            username: "system",
        };
    }

    const key = isVNID(usernameOrVNID) ? usernameOrVNID : User.slugIdPrefix + usernameOrVNID;  // The user's VNID or slugId

    // TODO: Create a Vertex Framework Proxy object that allows loading either a Human or a Bot

    const humanResult = await graph.pull(HumanUser, u => u.fullName.username(), {key,});
    if (humanResult.length === 1) {
        // This is a human user
        return {
            isBot: false,
            fullName: humanResult[0].fullName,
            username: humanResult[0].username,
        };
    } else if (humanResult.length > 1) { throw new Error("Inconsistent - Multiple users matched"); }

    const botResult = await graph.pull(BotUser, u => u.fullName.username().ownedBy(h => h.username()), {key, });
    if (botResult.length === 0) {
        if (isVNID(usernameOrVNID)) {
            log.error(`Failed to fetch user with key ${usernameOrVNID}`);
            // Don't leak user VNIDs via the API, even if it seems to be invalid.
            throw new Drash.Errors.HttpError(404, `No user found with that VNID.`);
        } else {
            throw new Drash.Errors.HttpError(404, `No user found with the username "${usernameOrVNID}".`);
        }
    } else if (botResult.length > 1) { throw new Error("Inconsistent - Multiple users matched"); }

    // This is a bot user:
    return {
        isBot: true,
        fullName: botResult[0].fullName,
        username: botResult[0].username,
        ownedByUsername: botResult[0].ownedBy?.username || "",  // Should never actually be null/""; an owner is required
    };
}
