import { C, Field } from "neolace/deps/vertex-framework.ts";
import { NeolaceHttpResource, graph, api, log } from "neolace/api/mod.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { HumanUser } from "../../core/User.ts";


export class RequestLoginResource extends NeolaceHttpResource {
    static paths = ["/auth/request-login"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({email: Field.validators.email, }),
        responseSchema: api.schemas.Schema({requested: api.schemas.boolean}),
        description: "Request passwordless login",
    }, async ({email}) => {
        try {
            const user = await graph.pullOne(HumanUser, u => u.id, {where: C`@this.email = ${email}`});
            await authClient.requestPasswordlessLogin({username: user.id});
        } catch (err) {
            log.debug(`Passwordless login request failed: ${err}`);
            return {requested: false};
        }
        log.debug(`Passwordless login request for ${email}`);
        return {requested: true};
    });
}
