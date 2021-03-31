import { Hapi, Boom, Joi, log, graph, api, defineEndpoint } from "../";
import { getPublicUserData } from "./_helpers";

defineEndpoint(__filename, {
    method: "GET",
    options: {
        description: "Get my public profile data",
        notes: "Get information about the logged in user (or bot)",
        auth: "technotes_strategy",
        validate: {},
    },
    handler: async (request, h) => {
        const user = request.auth.credentials.user;
        if (user === undefined) {
            throw Boom.internal("Auth Expected");
        }
        const data: api.PublicUserData = await getPublicUserData(user.username);
        return h.response(data);
    },
});
