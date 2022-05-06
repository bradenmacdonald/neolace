import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { api, getGraph, log, NeolaceHttpResource } from "neolace/api/mod.ts";
import { authClient } from "neolace/core/authn-client.ts";
import { HumanUser } from "../../core/User.ts";

export class RequestLoginResource extends NeolaceHttpResource {
    public paths = ["/auth/request-login"];

    POST = this.method({
        requestBodySchema: api.schemas.Schema({ email: Field.validators.email }),
        responseSchema: api.schemas.Schema({ requested: api.schemas.boolean }),
        description: "Request passwordless login",
    }, async ({ bodyData }) => {
        const graph = await getGraph();
        const { email } = bodyData;
        try {
            const user = await graph.pullOne(HumanUser, (u) => u.id, { where: C`@this.email = ${email}` });
            await authClient.requestPasswordlessLogin({ username: user.id });
        } catch (err) {
            if (err instanceof EmptyResultError) {
                // This user doesn't exist:
                return { requested: false };
            }
            throw err; // Some other internal error
        }
        log.info(`Passwordless login request for ${email}`);
        return { requested: true };
    });
}
