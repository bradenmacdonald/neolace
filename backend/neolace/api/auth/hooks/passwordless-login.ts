import { NeolaceHttpResource, api, log } from "neolace/api/mod.ts";
import { config } from "neolace/app/config.ts";


export class PasswordlessLoginWebhookResource extends NeolaceHttpResource {
    static paths = ["/auth/request-login"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({account_id: api.schemas.number, token: api.schemas.string }),
        responseSchema: api.schemas.Schema({}),
        description: "Passwordless login webhook",
        notes: "Passwordless login webhook (called by the Keratin AuthN microservice)",
    }, async (payload) => {
        const accountId = payload.account_id;
        const token = payload.token;
        log.debug(`Passwordless login for account ID ${accountId}`);
        const loginUrl = `${config.realmAdminUrl}/login/passwordless#${token}`;
        // TODO in future: email this link to the user
        log.info(`To log in, go to ${loginUrl}`);
        return await {};  // 'await' is just to make the Deno linter happy
    });
}
