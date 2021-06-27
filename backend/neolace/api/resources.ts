import { HomePageResource } from "./index.ts";
// import "./auth/request-login";
// import "./auth/hooks/passwordless-login";
// import "./site/{siteShortId}/schema";
// import "./site/{siteShortId}/draft";
// import "./site/{siteShortId}/draft/{draftId}";
// import "./site/{siteShortId}/draft/{draftId}/accept";
import { UserIndexResource } from "./user/index.ts";
//import "./user/me";

export const allResources = [
    HomePageResource,
    UserIndexResource,
];
