import { KeratinAuthNClient } from "neolace/deps/authn-deno.ts";
import { config } from "neolace/app/config.ts";

export const authClient = new KeratinAuthNClient({
    // appDomains: config.frontendDomains,
    appDomain: config.frontendDomains[0],
    authnUrl: config.authnUrl,
    authnPrivateUrl: config.authnPrivateUrl,
    username: config.authnApiUsername,
    password: config.authnApiPassword,
});
