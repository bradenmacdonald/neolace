import { Hapi, Boom, Joi, log, graph, api } from "../";
import { PublicUserData } from "neolace-api";
import { BotUser, HumanUser, User } from "../../core/User";
import { SYSTEM_UUID, UUID } from "vertex-framework";

/**
 * A helper function to get the profile of a specific user.
 *
 * All information returned by this is considered public.
 */
export async function getPublicUserData(usernameOrUUid: string|UUID): Promise<PublicUserData> {
    if (usernameOrUUid === "system" || usernameOrUUid === SYSTEM_UUID) {
        // Special case: the "system" user is neither a human nor a bot.
        return {
            isBot: false,
            fullName: "System (Neolace)",
            username: "system",
        };
    }

    const key = isUUID(usernameOrUUid) ? usernameOrUUid : User.shortIdPrefix + usernameOrUUid;  // The user's UUID or shortId

    // TODO: Create a Vertex Framework Proxy object that allows loading either a Human or a Bot

    const humanResult = await graph.pull(HumanUser, u => u.fullName.username(), {key,});
    if (humanResult.length === 1) {
        // This is a human user
        return {
            isBot: false,
            fullName: humanResult[0].fullName,
            username: humanResult[0].username,
        };
    } else if (humanResult.length > 1) { throw Boom.internal("Inconsistent - Multiple users matched"); }

    const botResult = await graph.pull(BotUser, u => u.fullName.username().ownedBy(h => h.username()), {key, });
    if (botResult.length === 0) {
        if (isUUID(usernameOrUUid)) {
            log.error(`Failed to fetch user with UUID ${usernameOrUUid}`);
            // Don't leak user UUIDs via the API, even if it seems to be invalid.
            throw Boom.notFound(`No user found with that UUID.`);
        } else {
            throw Boom.notFound(`No user found with the username "${usernameOrUUid}".`);
        }
    } else if (botResult.length > 1) { throw Boom.internal("Inconsistent - Multiple users matched"); }

    // This is a bot user:
    return {
        isBot: true,
        fullName: botResult[0].fullName,
        username: botResult[0].username,
        ownedByUsername: botResult[0].ownedBy?.username || "",  // Should never actually be null/""; an owner is required
    };
}

function isUUID(something: string): boolean {
    try {
        UUID(something);
    } catch (err) {
        return false;
    }
    return true;
}
