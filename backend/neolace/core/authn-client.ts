import { config } from "neolace/app/config.ts";


// A mock client - temporary
class KeratinAuthNClient {
    constructor(_args: unknown) {}

    createUser(_args: {username: string}) {
        return {accountId: Math.floor(Math.random() * 100_000)};
    }
}


export const authClient = new KeratinAuthNClient({
    appDomain: "localhost:5555",
    authnUrl: config.authnUrl,
    authnPrivateUrl: config.authnPrivateUrl,
    username: config.authnApiUsername,
    password: config.authnApiPassword,
});
