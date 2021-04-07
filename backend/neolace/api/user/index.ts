import { Hapi, Boom, Joi, log, graph, api, defineEndpoint, adaptErrors } from "../";
import { CreateUser } from "../../core/User";
import { getPublicUserData } from "./_helpers";

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Create a user account",
        notes: "This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.",
        auth: false,
        tags: ["api"],
        validate: {
            payload: Joi.object({
                email: Joi.string().required(),
                fullName: Joi.string(),
                username: Joi.string(),
            }),
        },
    },
    handler: async (request, h) => {

        const payload: {username?: string, fullName?: string, email: string} = request.payload as any;

        const result = await graph.runAsSystem(CreateUser({
            email: payload.email,
            fullName: payload.fullName,
            username: payload.username,
        })).catch(adaptErrors("email", "fullName", adaptErrors.remap("shortId", "username")));  // An error in the "shortId" property gets remapped into the "username" field

        const newUserData: api.PublicUserData = await getPublicUserData(result.uuid);
        return h.response(newUserData);

    },
});
