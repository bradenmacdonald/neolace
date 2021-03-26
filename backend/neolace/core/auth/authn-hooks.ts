import * as Hapi from "@hapi/hapi";
import * as Joi from "@hapi/joi";

import { log } from "../../app/log";
import { config } from "../../app/config";

const prefix = `/auth-hooks`;

export const authnHooks: Hapi.ServerRoute[] = [
    ///////////////////////////// Passwordless login webhook (called by the Keratin AuthN microservice)
    {
        method: "POST",
        path: `${prefix}/passwordless-login`,
        handler: (request, h) => {
            const accountId = (request.payload as any).account_id;
            const token = (request.payload as any).token;
            log.debug(`Passwordless login for account ID ${accountId}`);
            const loginUrl = `${config.frontendUrl}/login/passwordless#${token}`;
            // TODO in future: email this link to the user
            log.success(`To log in, go to ${loginUrl}`);
            return {};
        },
        options: {
            auth: false, // This webhook can be called by our authn microservice without any authentication
            validate: {
                payload: Joi.object({
                    account_id: Joi.number().required(),
                    token: Joi.string().required(),
                }),
            }
        },
    },
];
