import { HomePageResource } from "./index.ts";
// import "./auth/request-login";
// import "./auth/hooks/passwordless-login";
// import "./site/{siteShortId}/schema";
// import "./site/{siteShortId}/draft";
// import "./site/{siteShortId}/draft/{draftId}";
// import "./site/{siteShortId}/draft/{draftId}/accept";
import { UserIndexResource } from "./user/index.ts";
import { UserMeResource } from "./user/me.ts";

export const allResources = [
    HomePageResource,
    UserIndexResource,
    UserMeResource,
];
