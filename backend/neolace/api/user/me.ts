import { api, NeolaceHttpResource } from "neolace/api/mod.ts";
import { getPublicUserData } from "./_helpers.ts";

export class UserMeResource extends NeolaceHttpResource {
    public paths = ["/user/me"];

    GET = this.method({
        responseSchema: api.schemas.UserDataResponse,
        description: "Get my public profile data",
        notes: "Get information about the logged in user (or bot)",
    }, async ({ request }) => {
        const user = this.requireUser(request);
        return await getPublicUserData(user.username);
    });
}
