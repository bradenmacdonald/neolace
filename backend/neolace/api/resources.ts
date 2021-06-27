import { HomePageResource } from "./index.ts";
// import "./auth/request-login";
// import "./auth/hooks/passwordless-login";
import { SchemaIndexResource } from "./site/{siteShortId}/schema/index.ts";
import { DraftIndexResource } from "./site/{siteShortId}/draft/index.ts";
import { DraftResource } from "./site/{siteShortId}/draft/{draftId}/index.ts";
import { AcceptDraftResource } from "./site/{siteShortId}/draft/{draftId}/accept.ts";
import { UserIndexResource } from "./user/index.ts";
import { UserMeResource } from "./user/me.ts";

export const allResources = [
    HomePageResource,

    SchemaIndexResource,
    DraftIndexResource,
    DraftResource,
    AcceptDraftResource,
    UserIndexResource,
    UserMeResource,
];
