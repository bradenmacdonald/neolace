import { C } from "vertex-framework";
import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors } from "../";
import { authClient } from "../../core/auth/authn";
import { CreateUser, HumanUser, User } from "../../core/User";
import { getPublicUserData } from "./_helpers";

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Create a user account",
        notes: "This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.",
        auth: false,
        tags: ["api"],
    },
    handler: async (request, h) => {

        const payload: {username?: string, fullName?: string, email: string} = request.payload as any;

        const result = await graph.runAsSystem(CreateUser({
            email: payload.email,
            fullName: payload.fullName,
            username: payload.username,
        })).catch(adaptErrors("email", "fullName", "username"));

        const newUserData: api.PublicUserData = await getPublicUserData(result.uuid);
        return h.response(newUserData);

    },
});
