import { NeolaceHttpResource, graph, api, adaptErrors, method } from "neolace/api/mod.ts";
import { CreateUser } from "../../core/User.ts";
import { getPublicUserData } from "./_helpers.ts";

export class UserIndexResource extends NeolaceHttpResource {
    static paths = ["/user"];

    @method.description("Create a user account")
    @method.notes("This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.")
    public async POST() {
        const payload = this.getRequestPayload(api.schemas.CreateHumanUser);

        const result = await graph.runAsSystem(CreateUser(payload)).catch(adaptErrors("email", "fullName", adaptErrors.remap("slugId", "username")));  // An error in the "slugId" property gets remapped into the "username" field

        const newUserData: api.PublicUserData = await getPublicUserData(result.id);
        this.response.body = newUserData;
   
        return this.response;
    }
}
