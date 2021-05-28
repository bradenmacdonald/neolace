import { Hapi, Boom, Joi, log, graph, api, defineEndpoint } from "../../";
import { config } from "../../../app/config";

defineEndpoint(__filename, {
    method: "POST",
    options: {
        description: "Passwordless login webhook",
        notes: "Passwordless login webhook (called by the Keratin AuthN microservice)",
        auth: false, // This webhook can be called by our authn microservice without any authentication
        validate: {
            payload: Joi.object({
                account_id: Joi.number().required(),
                token: Joi.string().required(),
            }),
        },
    },
    handler: async (request, h) => {
        const accountId = (request.payload as any).account_id;
        const token = (request.payload as any).token;
        log.debug(`Passwordless login for account ID ${accountId}`);
        const loginUrl = `${config.realmAdminUrl}/login/passwordless#${token}`;
        // TODO in future: email this link to the user
        log.success(`To log in, go to ${loginUrl}`);
        return h.response({});
    },
});
