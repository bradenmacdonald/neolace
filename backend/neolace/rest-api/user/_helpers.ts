/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Drash, getGraph, log, SDK } from "neolace/rest-api/mod.ts";
import { BotUser, HumanUser } from "neolace/core/User.ts";
import { C, isVNID, SYSTEM_VNID, VNID } from "neolace/deps/vertex-framework.ts";

/**
 * A helper function to get the profile of a specific user.
 *
 * All information returned by this is considered public.
 */
export async function getPublicUserData(
    usernameOrVNID: string | VNID,
): Promise<SDK.schemas.Type<typeof SDK.UserDataResponse>> {
    if (usernameOrVNID === "system" || usernameOrVNID === SYSTEM_VNID) {
        // Special case: the "system" user is neither a human nor a bot.
        return {
            isBot: false,
            fullName: "System (Neolace)",
            username: "system",
        };
    }

    const graph = await getGraph();
    const filter = {
        where: isVNID(usernameOrVNID) ? C`@this.id = ${usernameOrVNID}` : C`@this.username = ${usernameOrVNID}`,
    };

    // TODO: Create a Vertex Framework Proxy object that allows loading either a Human or a Bot

    const humanResult = await graph.pull(HumanUser, (u) => u.fullName.username, filter);
    if (humanResult.length === 1) {
        // This is a human user
        return {
            isBot: false,
            fullName: humanResult[0].fullName,
            username: humanResult[0].username,
        };
    } else if (humanResult.length > 1) throw new Error("Inconsistent - Multiple users matched");

    const botResult = await graph.pull(BotUser, (u) => u.fullName.username.ownedBy((h) => h.username), filter);
    if (botResult.length === 0) {
        if (isVNID(usernameOrVNID)) {
            log.error(`Failed to fetch user with key ${usernameOrVNID}`);
            // Don't leak user VNIDs via the API, even if it seems to be invalid.
            throw new Drash.Errors.HttpError(404, `No user found with that VNID.`);
        } else {
            throw new Drash.Errors.HttpError(404, `No user found with the username "${usernameOrVNID}".`);
        }
    } else if (botResult.length > 1) throw new Error("Inconsistent - Multiple users matched");

    // This is a bot user:
    return {
        isBot: true,
        fullName: botResult[0].fullName,
        username: botResult[0].username,
        ownedByUsername: botResult[0].ownedBy?.username || "", // Should never actually be null/""; an owner is required
    };
}
