import { HomePageResource } from "./index.ts";
import { HealthCheckResource } from "./health.ts";
import { RequestLoginResource } from "./auth/request-login.ts";
import { PasswordlessLoginWebhookResource } from "./auth/hooks/passwordless-login.ts";
import { SystemKeyResource } from "./auth/system-key.ts";
import { SiteFindByDomainResource } from "./site/find.ts";
import { SiteHomeResource } from "./site/{siteFriendlyId}/home.ts";
import { EvaluateLookupResource } from "./site/{siteFriendlyId}/lookup.ts";
import { SchemaIndexResource } from "./site/{siteFriendlyId}/schema/index.ts";
import { DraftIndexResource } from "./site/{siteFriendlyId}/draft/index.ts";
import { DraftResource } from "./site/{siteFriendlyId}/draft/{draftIdNum}/index.ts";
import { DraftEditsResource } from "./site/{siteFriendlyId}/draft/{draftIdNum}/edit/index.ts";
import { DraftFileResource } from "./site/{siteFriendlyId}/draft/{draftIdNum}/file.ts";
import { AcceptDraftResource } from "./site/{siteFriendlyId}/draft/{draftIdNum}/accept.ts";
import { EntryListResource } from "./site/{siteFriendlyId}/entry/index.ts";
import { EntryResource } from "./site/{siteFriendlyId}/entry/{entryId}/index.ts";
import { SiteUserIndexResource } from "./site/{siteFriendlyId}/user/index.ts";
import { SiteUserMyPermissionsResource } from "./site/{siteFriendlyId}/my-permissions.ts";
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
