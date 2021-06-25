import { C } from "neolace/deps/vertex-framework.ts";
import { Hapi, Boom, Joi, log, graph, api, defineEndpoint } from "..";
import { authClient } from "../authn";
import { HumanUser } from "../../core/User";

// See also core/auth/authn-hooks.ts

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Request passwordless login",
        auth: false,
        tags: ["api"],
        validate: {
            payload: Joi.object({
                email: Joi.string().required(),
            }).label("PasswordlessLoginRequest"),
        },
        response: { status: {
            200: Joi.object({requested: Joi.boolean().required()}).label("PasswordlessLoginResponse"),
        } },
    },
    handler: async (request, h) => {
        const email = (request.payload as any).email;
        try {
            const user = await graph.pullOne(HumanUser, u => u.id, {where: C`@this.email = ${email}`});
            await authClient.requestPasswordlessLogin({username: user.id});
        } catch (err) {
            log.debug(`Passwordless login request failed: ${err}`);
            return h.response({requested: false});
        }
        log.debug(`Passwordless login request for ${email}`);
        return h.response({requested: true});
    },
});
