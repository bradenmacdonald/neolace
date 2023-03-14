/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { HomePageResource } from "./index.ts";
import { HealthCheckResource } from "./health.ts";
import { RequestLoginResource } from "./auth/request-login.ts";
import { PasswordlessLoginWebhookResource } from "./auth/hooks/passwordless-login.ts";
import { SystemKeyResource } from "./auth/system-key.ts";
import { SiteFindByDomainResource } from "./find-site.ts";
import { SiteHomeResource } from "./site/[siteKey]/home.ts";
import { EvaluateLookupResource } from "./site/[siteKey]/lookup.ts";
import { SchemaIndexResource } from "./site/[siteKey]/schema/index.ts";
import { DraftIndexResource } from "./site/[siteKey]/draft/index.ts";
import { DraftResource } from "./site/[siteKey]/draft/[draftNum]/index.ts";
import { DraftEditsResource } from "./site/[siteKey]/draft/[draftNum]/edit/index.ts";
import { TempFileResource } from "./site/[siteKey]/file.ts";
import { AcceptDraftResource } from "./site/[siteKey]/draft/[draftNum]/accept.ts";
import { EntryListResource } from "./site/[siteKey]/entry/index.ts";
import { EntryResource } from "./site/[siteKey]/entry/[entryId]/index.ts";
import { SiteResource } from "./site/[siteKey]/index.ts";
import { SiteGroupsResource } from "./site/[siteKey]/group/index.ts";
import { SiteGroupMemberResource } from "./site/[siteKey]/group/[groupId]/user/[username]/index.ts";
import { SiteUserIndexResource } from "./site/[siteKey]/user/index.ts";
import { SiteUserMyPermissionsResource } from "./site/[siteKey]/my-permissions.ts";
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
    TempFileResource,
    AcceptDraftResource,
    EntryListResource,
    EntryResource,
    SiteResource,
    SiteGroupsResource,
    SiteGroupMemberResource,
    SiteUserIndexResource,
    SiteUserMyPermissionsResource,
    UserIndexResource,
    UserMeResource,
    VerifyUserEmailResource,
];
