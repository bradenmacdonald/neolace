/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { getPublicUserData } from "./_helpers.ts";

export class UserMeResource extends NeolaceHttpResource {
    public paths = ["/user/me"];

    GET = this.method({
        responseSchema: SDK.UserDataResponse,
        description: "Get my public profile data",
        notes: "Get information about the logged in user (or bot)",
    }, async ({ request }) => {
        const user = this.requireUser(request);
        return await getPublicUserData(user.username);
    });
}
