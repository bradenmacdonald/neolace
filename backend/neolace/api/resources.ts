import { HomePageResource } from "./index.ts";
import { HealthCheckResource } from "./health.ts";
import { RequestLoginResource } from "./auth/request-login.ts";
import { PasswordlessLoginWebhookResource } from "./auth/hooks/passwordless-login.ts";
import { SystemKeyResource } from "./auth/system-key.ts";
import { SiteFindByDomainResource } from "./site/find.ts";
import { SiteHomeResource } from "./site/{siteShortId}/home.ts";
import { EvaluateLookupResource } from "./site/{siteShortId}/lookup.ts";
import { SchemaIndexResource } from "./site/{siteShortId}/schema/index.ts";
import { DraftIndexResource } from "./site/{siteShortId}/draft/index.ts";
import { DraftResource } from "./site/{siteShortId}/draft/{draftIdNum}/index.ts";
import { DraftEditsResource } from "./site/{siteShortId}/draft/{draftIdNum}/edit/index.ts";
import { DraftFileResource } from "./site/{siteShortId}/draft/{draftIdNum}/file.ts";
import { AcceptDraftResource } from "./site/{siteShortId}/draft/{draftIdNum}/accept.ts";
import { EntryListResource } from "./site/{siteShortId}/entry/index.ts";
import { EntryResource } from "./site/{siteShortId}/entry/{entryId}/index.ts";
import { SiteUserIndexResource } from "./site/{siteShortId}/user/index.ts";
import { SiteUserMyPermissionsResource } from "./site/{siteShortId}/my-permissions.ts";
import { UserIndexResource } from "./user/index.ts";
import { UserMeResource } from "./user/me.ts";
import { VerifyUserEmailResource } from "./user/verify-email.ts";
import { type Drash } from "./mod.ts";

export const builtInRestApiResources: (typeof Drash.Resource)[] = [
    HomePageResource,
    HealthCheckResource,
    RequestLoginResource,
    PasswordlessLoginWebhookResource,
    SystemKeyResource,
    SiteFindByDomainResource,
    SiteHomeResource,
    EvaluateLookupResource,
    SchemaIndexResource,
    DraftIndexResource,
    DraftResource,
    DraftEditsResource,
    DraftFileResource,
    AcceptDraftResource,
    EntryListResource,
    EntryResource,
    SiteUserIndexResource,
    SiteUserMyPermissionsResource,
    UserIndexResource,
    UserMeResource,
    VerifyUserEmailResource,
];
