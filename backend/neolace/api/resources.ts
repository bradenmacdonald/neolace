import { HomePageResource } from "./index.ts";
import { HealthCheckResource } from "./health.ts";
import { RequestLoginResource } from "./auth/request-login.ts";
import { PasswordlessLoginWebhookResource } from "./auth/hooks/passwordless-login.ts";
import { SiteLookupResource } from "./site/lookup.ts";
import { SiteHomeResource } from "./site/{siteShortId}/home.ts";
import { SchemaIndexResource } from "./site/{siteShortId}/schema/index.ts";
import { DraftIndexResource } from "./site/{siteShortId}/draft/index.ts";
import { DraftResource } from "./site/{siteShortId}/draft/{draftId}/index.ts";
import { AcceptDraftResource } from "./site/{siteShortId}/draft/{draftId}/accept.ts";
import { EntryResource } from "./site/{siteShortId}/entry/{entryId}/index.ts";
import { UserIndexResource } from "./user/index.ts";
import { UserMeResource } from "./user/me.ts";
import { type NeolaceHttpResource } from "./mod.ts";

export const builtInRestApiResources: (typeof NeolaceHttpResource)[] = [
    HomePageResource,
    HealthCheckResource,
    RequestLoginResource,
    PasswordlessLoginWebhookResource,
    SiteLookupResource,
    SiteHomeResource,
    SchemaIndexResource,
    DraftIndexResource,
    DraftResource,
    AcceptDraftResource,
    EntryResource,
    UserIndexResource,
    UserMeResource,
];
