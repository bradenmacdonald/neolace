import { assert, assertEquals, assertThrows, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { AccessMode, Site, UpdateSite } from "neolace/core/Site.ts";
import {
    AllOf,
    CanEditSiteSettings,
    CanViewEntries,
    Check,
    CheckContext,
    CheckSiteIsPublic,
    CheckSiteIsPublicContributions,
    CheckUserHasGrants,
    OneOf,
} from "neolace/core/permissions.ts";
import { VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { CreateBot } from "neolace/core/User.ts";
import { PermissionGrant, UpdateGroup } from "neolace/core/Group.ts";

group(import.meta, () => {
    group("basic permissions tests", () => {
        const TrueCheck: Check = () => true;
        const FalseCheck: Check = () => false;
        const emptyContext: CheckContext = { tx: {/* fake transaction */} as WrappedTransaction };

        test(`OneOf is an OR check`, async () => {
            // should be true:
            assert(await OneOf(TrueCheck)(emptyContext));
            assert(await OneOf(TrueCheck, FalseCheck)(emptyContext));
            assert(await OneOf(FalseCheck, FalseCheck, FalseCheck, TrueCheck)(emptyContext));
            // Should be false:
            assert(!await OneOf(FalseCheck)(emptyContext));
            assert(!await OneOf(FalseCheck, FalseCheck)(emptyContext));
            assert(!await OneOf(FalseCheck, FalseCheck, FalseCheck)(emptyContext));
            assert(!await OneOf()(emptyContext));
        });

        test(`AllOf is an AND check`, async () => {
            // should be true:
            assert(await AllOf(TrueCheck)(emptyContext));
            assert(await AllOf(TrueCheck, TrueCheck)(emptyContext));
            assert(await AllOf(TrueCheck, TrueCheck, TrueCheck, TrueCheck)(emptyContext));
            // Should be false:
            assert(!await AllOf(FalseCheck)(emptyContext));
            assert(!await AllOf(TrueCheck, FalseCheck)(emptyContext));
            assert(!await AllOf(TrueCheck, TrueCheck, FalseCheck)(emptyContext));
            // Should be invalid:
            assertThrows(() => AllOf());
        });
    });

    group("Permissions tests using graph data", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        const check = (check: Check, userId?: VNID): Promise<boolean> => {
            return graph.read(async (tx) => await check({ tx, siteId: defaultData.site.id, userId }));
        };

        test(`site access mode checks`, async () => {
            const siteId = defaultData.site.id;
            const initialSite = await graph.pullOne(Site, (s) => s.accessMode, { key: siteId });

            ////////////////////////////////////////////////////////////////////////
            // The site is in "public contributions" mode:
            assertEquals(initialSite.accessMode, AccessMode.PublicContributions);

            assert(await check(CheckSiteIsPublic));
            assert(await check(CheckSiteIsPublicContributions));
            assert(await check(CanViewEntries)); // An anonymous user should have permission to view entries

            ////////////////////////////////////////////////////////////////////////
            // Change the site to "public read-only" mode:
            await graph.runAsSystem(UpdateSite({ key: siteId, accessMode: AccessMode.PublicReadOnly }));

            assert(await check(CheckSiteIsPublic));
            assert(!await check(CheckSiteIsPublicContributions)); // This is now false
            assert(await check(CanViewEntries)); // An anonymous user should still have permission to view entries

            ////////////////////////////////////////////////////////////////////////
            // Change the site to "private" mode:
            await graph.runAsSystem(UpdateSite({ key: siteId, accessMode: AccessMode.Private }));

            assert(!await check(CheckSiteIsPublic)); // This is now false
            assert(!await check(CheckSiteIsPublicContributions)); // This is still false
            assert(!await check(CanViewEntries)); // Now an anonymous user will not have permission to view entries
        });

        test(`check permissions granted via groups`, async () => {
            // "Alex" is in the administrators group so can edit site settings:
            assert(await check(CanEditSiteSettings, defaultData.users.admin.id));
            // Whereas Jamie is in the users group so cannot:
            assert(!await check(CanEditSiteSettings, defaultData.users.regularUser.id));
        });

        test(`bot user permissions - inheriting from owner user`, async () => {
            // A bot user can optionally inherit permissions from its owner

            const inheritingBot = await graph.runAsSystem(CreateBot({
                ownedByUser: defaultData.users.admin.id,
                username: "inheriting-bot",
                fullName: "Inheriting Bot",
                inheritPermissions: true,
            }));

            const regularBot = await graph.runAsSystem(CreateBot({
                ownedByUser: defaultData.users.admin.id,
                username: "regular-bot",
                fullName: "Regular Bot",
                inheritPermissions: false,
            }));

            // Alex has permission to administer the site:
            assert(await check(CheckUserHasGrants(PermissionGrant.administerSite), defaultData.users.admin.id));
            // So a bot that he owns with "inerhit permissions" should too:
            assert(await check(CheckUserHasGrants(PermissionGrant.administerSite), inheritingBot.id));
            // But a bot that he owns, without "inherit permissions" will not:
            assert(!await check(CheckUserHasGrants(PermissionGrant.administerSite), regularBot.id));

            // ... unless we add it to a group
            await graph.runAsSystem(UpdateGroup({
                key: defaultData.site.adminsGroupId,
                addUsers: [regularBot.id],
            }));
            assert(await check(CheckUserHasGrants(PermissionGrant.administerSite), regularBot.id));
        });
    });
});
