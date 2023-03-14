/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { VNID } from "neolace/deps/vertex-framework.ts";

import { adaptErrors, getGraph, NeolaceHttpResource, SDK } from "neolace/rest-api/mod.ts";
import { CreateUser, HumanUser } from "neolace/core/User.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { getPublicUserData } from "./_helpers.ts";
import { checkValidationToken } from "./verify-email.ts";
import { createRandomToken } from "../../lib/secure-token.ts";

export class UserIndexResource extends NeolaceHttpResource {
    public paths = ["/user"];

    POST = this.method({
        responseSchema: SDK.CreateHumanUserResponse,
        requestBodySchema: SDK.CreateHumanUser,
        description: "Create a user account",
        notes:
            "This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.",
    }, async ({ request, bodyData }) => {
        if (request.user) {
            throw new SDK.NotAuthorized("You cannot create an account if you are already logged in.");
        }

        // Get the email address from the token - this ensures that the email address has been verified already.
        const email: string = (await checkValidationToken(bodyData.emailToken)).email;

        // Make sure no account with that email already exists:
        const graph = await getGraph();
        const checkEmail = await graph.pull(HumanUser, (u) => u.id, { with: { email } });
        if (checkEmail.length !== 0) {
            throw new SDK.InvalidRequest(
                SDK.InvalidRequestReason.EmailAlreadyRegistered,
                "A user account is already registered with that email address.",
            );
        }

        // OK at this point we can be pretty sure the data is valid, so next
        // we create their account in the auth server (required before we save their User record)
        const userId = VNID(); // Their new internal user ID.
        // Create a temporary password that the API client can use to (1) log in the user and (2) set a new password
        const tempPassword = await createRandomToken(24);
        const authnData = await authClient.createUser({ username: userId, password: tempPassword });

        // Now we create their user account

        const result = await graph.runAsSystem(CreateUser({
            id: userId,
            authnId: authnData.accountId,
            email,
            fullName: bodyData.fullName,
            username: bodyData.username, // Auto-generate a username if it is not specified
        })).catch(
            adaptErrors("email", "fullName", "username"),
        );

        const userData = await getPublicUserData(result.id);
        console.log(`Created new user ${userId} with username ${userData.username}`);
        return {
            userData,
            temporaryCredentials: {
                username: userId,
                password: tempPassword,
            },
        };
    });
}
