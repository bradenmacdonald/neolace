import { NeolaceHttpResource, api, log } from "neolace/api/mod.ts";
import { config } from "neolace/app/config.ts";


export class PasswordlessLoginWebhookResource extends NeolaceHttpResource {
    public paths = ["/auth/passwordless-login"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({account_id: api.schemas.string, token: api.schemas.string }),
        responseSchema: api.schemas.Schema({}),
        description: "Passwordless login webhook",
        notes: "Passwordless login webhook (called by the Keratin AuthN microservice)",
    }, async ({bodyData}) => {
        const accountId = bodyData.account_id;
        const token = bodyData.token;
        log.debug(`Passwordless login for account ID ${accountId}`);
        const loginUrl = `${config.realmAdminUrl}/login/passwordless#${token}`;
        // TODO in future: email this link to the user
        log.info(`To log in, go to ${loginUrl}`);
        return await {};  // 'await' is just to make the Deno linter happy
    });
}
