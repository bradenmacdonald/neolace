import { suite, test, assert, beforeEach, setTestIsolation, assertRejects } from "../lib/intern-tests";
import { graph } from "./graph";
import { AccessMode, CreateSite, Site, UpdateSite } from "./Site";
import { AllOf, CanEditSiteSettings, CanViewEntries, Check, CheckContext, CheckSiteIsPublic, CheckSiteIsPublicContributions, CheckUserHasGrants, OneOf } from "./permissions";
import { C, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { BotUser, CreateBot, HumanUser, User } from "./User";
import { PermissionGrant, UpdateGroup } from "./Group";

suite(__filename, () => {

    suite("basic permissions tests", () => {

        const TrueCheck: Check = () => true;
        const FalseCheck: Check = () => false;
        const emptyContext: CheckContext = {tx: {/* fake transaction */} as WrappedTransaction};

        test(`OneOf is an OR check`, async () => {
            // should be true:
            assert.isTrue(await OneOf(TrueCheck)(emptyContext));
            assert.isTrue(await OneOf(TrueCheck, FalseCheck)(emptyContext));
            assert.isTrue(await OneOf(FalseCheck, FalseCheck, FalseCheck, TrueCheck)(emptyContext));
            // Should be false:
            assert.isFalse(await OneOf(FalseCheck)(emptyContext));
            assert.isFalse(await OneOf(FalseCheck, FalseCheck)(emptyContext));
            assert.isFalse(await OneOf(FalseCheck, FalseCheck, FalseCheck)(emptyContext));
            assert.isFalse(await OneOf()(emptyContext));
        });

        test(`AllOf is an AND check`, async () => {
            // should be true:
            assert.isTrue(await AllOf(TrueCheck)(emptyContext));
            assert.isTrue(await AllOf(TrueCheck, TrueCheck)(emptyContext));
            assert.isTrue(await AllOf(TrueCheck, TrueCheck, TrueCheck, TrueCheck)(emptyContext));
            // Should be false:
            assert.isFalse(await AllOf(FalseCheck)(emptyContext));
            assert.isFalse(await AllOf(TrueCheck, FalseCheck)(emptyContext));
            assert.isFalse(await AllOf(TrueCheck, TrueCheck, FalseCheck)(emptyContext));
            // Should be invalid:
            assert.throws(() => AllOf());
        });
    });

    suite("Permissions tests using graph data", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

        const check = async (check: Check, userId?: VNID): Promise<boolean> => {
            return graph.read(async tx => check({tx, siteId: defaultData.site.id, userId}));
        };


        test(`site access mode checks`, async () => {

            const siteId = defaultData.site.id;
            const initialSite = await graph.pullOne(Site, s => s.accessMode, {key: siteId});

            ////////////////////////////////////////////////////////////////////////
            // The site is in "public contributions" mode:
            assert.equal(initialSite.accessMode, AccessMode.PublicContributions);

            assert.isTrue(await check(CheckSiteIsPublic));
            assert.isTrue(await check(CheckSiteIsPublicContributions));
            assert.isTrue(await check(CanViewEntries));  // An anonymous user should have permission to view entries

            ////////////////////////////////////////////////////////////////////////
            // Change the site to "public read-only" mode:
            await graph.runAsSystem(UpdateSite({key: siteId, accessMode: AccessMode.PublicReadOnly}));

            assert.isTrue(await check(CheckSiteIsPublic));
            assert.isFalse(await check(CheckSiteIsPublicContributions));  // This is now false
            assert.isTrue(await check(CanViewEntries));  // An anonymous user should still have permission to view entries

            ////////////////////////////////////////////////////////////////////////
            // Change the site to "private" mode:
            await graph.runAsSystem(UpdateSite({key: siteId, accessMode: AccessMode.Private}));

            assert.isFalse(await check(CheckSiteIsPublic));  // This is now false
            assert.isFalse(await check(CheckSiteIsPublicContributions));  // This is still false
            assert.isFalse(await check(CanViewEntries));  // Now an anonymous user will not have permission to view entries
        });

        test(`check permissions granted via groups`, async () => {
            // "Alex" is in the administrators group so can edit site settings:
            assert.isTrue(await check(CanEditSiteSettings, defaultData.users.admin.id));
            // Whereas Jamie is in the users group so cannot:
            assert.isFalse(await check(CanEditSiteSettings, defaultData.users.regularUser.id));
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
            assert.isTrue(await check(CheckUserHasGrants(PermissionGrant.administerSite), defaultData.users.admin.id));
            // So a bot that he owns with "inerhit permissions" should too:
            assert.isTrue(await check(CheckUserHasGrants(PermissionGrant.administerSite), inheritingBot.id));
            // But a bot that he owns, without "inherit permissions" will not:
            assert.isFalse(await check(CheckUserHasGrants(PermissionGrant.administerSite), regularBot.id));

            // ... unless we add it to a group
            await graph.runAsSystem(UpdateGroup({
                key: defaultData.site.adminsGroupId,
                addUsers: [regularBot.id],
            }));
            assert.isTrue(await check(CheckUserHasGrants(PermissionGrant.administerSite), regularBot.id));
        });

    });
});
