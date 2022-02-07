import { api, NeolaceHttpResource } from "neolace/api/mod.ts";
import { createRandomToken } from "neolace/lib/secure-token.ts";
import { hashSystemKey } from "neolace/api/auth-middleware.ts";

export class SystemKeyResource extends NeolaceHttpResource {
    public paths = ["/auth/system-key"];

    GET = this.method({
        responseSchema: api.schemas.Schema({
            systemKey: api.schemas.string,
            systemKeyHash: api.schemas.string,
        }),
        description:
            "Generate a secure system API key (you must still update the configuration manually before it will work though)",
    }, async () => {
        const systemKey = `SYS_KEY_${(await createRandomToken()).toUpperCase()}`;
        const systemKeyHash = await hashSystemKey(systemKey);
        return {
            systemKey,
            systemKeyHash,
        };
    });
}
