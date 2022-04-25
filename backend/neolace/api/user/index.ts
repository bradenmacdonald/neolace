import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";

import { adaptErrors, api, getGraph, NeolaceHttpResource } from "neolace/api/mod.ts";
import { CreateUser, HumanUser } from "neolace/core/User.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { getPublicUserData } from "./_helpers.ts";

const validateEmail = Field.validators.email;

export class UserIndexResource extends NeolaceHttpResource {
    public paths = ["/user"];

    POST = this.method({
        responseSchema: api.schemas.UserDataResponse,
        requestBodySchema: api.schemas.CreateHumanUser,
        description: "Create a user account",
        notes:
            "This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.",
    }, async ({ request, bodyData }) => {
        if (request.user) {
            throw new api.NotAuthorized("You cannot create an account if you are already logged in.");
        }

        // Validate the email address before we try doing anything else:
        const email = bodyData.email.toLowerCase();
        try {
            validateEmail(email);
        } catch (err) {
            throw new api.InvalidFieldValue([{ fieldPath: "email", message: err.message }]);
        }
        const graph = await getGraph();
        const checkEmail = await graph.pull(HumanUser, (u) => u.id, { where: C`@this.email = ${email}` });
        if (checkEmail.length !== 0) {
            throw new api.InvalidRequest(
                api.InvalidRequestReason.EmailAlreadyRegistered,
                "A user account is already registered with that email address.",
            );
        }

        // OK at this point we can be pretty sure the data is valid, so next
        // we create their account in the auth server (required before we save their User record)
        const userId = VNID(); // Their new internal user ID.
        const authnData = await authClient.createUser({ username: userId });

        // Now we create their user account

        const result = await graph.runAsSystem(CreateUser({
            id: userId,
            authnId: authnData.accountId,
            email,
            fullName: bodyData.fullName,
            username: bodyData.username, // Auto-generate a username if it is not specified
        })).catch(
            adaptErrors("email", "fullName", adaptErrors.remap("slugId", "username")),
        ); // An error in the "slugId" property gets remapped into the "username" field

        return await getPublicUserData(result.id);
    });
}
