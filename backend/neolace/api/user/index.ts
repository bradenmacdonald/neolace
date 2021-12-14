import { NeolaceHttpResource, graph, api, adaptErrors, } from "neolace/api/mod.ts";
import { CreateUser } from "../../core/User.ts";
import { getPublicUserData } from "./_helpers.ts";

export class UserIndexResource extends NeolaceHttpResource {
    public paths = ["/user"];

    POST = this.method({
        responseSchema: api.schemas.UserDataResponse,
        requestBodySchema: api.schemas.CreateHumanUser,
        description: "Create a user account",
        notes: "This is only for human users; bots should use the bot API. Every human should have one account; creating multiple accounts is discouraged.",
    }, async ({bodyData}) => {
        const result = await graph.runAsSystem(CreateUser(bodyData)).catch(adaptErrors("email", "fullName", adaptErrors.remap("slugId", "username")));  // An error in the "slugId" property gets remapped into the "username" field

        return await getPublicUserData(result.id);
    });
}
