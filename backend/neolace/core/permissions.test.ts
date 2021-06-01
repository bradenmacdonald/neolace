import { suite, test, assert, beforeEach, setTestIsolation, assertRejects } from "../lib/intern-tests";
import { graph } from "./graph";
import { AccessMode, CreateSite, Site, UpdateSite } from "./Site";
import { AllOf, CanEditSiteSettings, CanViewEntries, Check, CheckContext, CheckSiteIsPublic, CheckSiteIsPublicContributions, OneOf } from "./permissions";
import { WrappedTransaction } from "vertex-framework";

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

        test(`site access mode checks`, async () => {

            const siteId = defaultData.site.id;
            const initialSite = await graph.pullOne(Site, s => s.accessMode, {key: siteId});

            ////////////////////////////////////////////////////////////////////////
            // The site is in "public contributions" mode:
            assert.equal(initialSite.accessMode, AccessMode.PublicContributions);

            assert.isTrue(await graph.read(async tx =>
                CheckSiteIsPublic({tx, siteId})
            ));
            assert.isTrue(await graph.read(async tx =>
                CheckSiteIsPublicContributions({tx, siteId})
            ));
            assert.isTrue(await graph.read(async tx =>
                CanViewEntries({tx, siteId})  // An anonymous user should have permission to view entries
            ));
            ////////////////////////////////////////////////////////////////////////
            // Change the site to "public read-only" mode:
            await graph.runAsSystem(UpdateSite({key: siteId, accessMode: AccessMode.PublicReadOnly}));

            assert.isTrue(await graph.read(async tx =>
                CheckSiteIsPublic({tx, siteId})
            ));
            assert.isFalse(await graph.read(async tx =>
                CheckSiteIsPublicContributions({tx, siteId})  // This is now false
            ));
            assert.isTrue(await graph.read(async tx =>
                CanViewEntries({tx, siteId})  // An anonymous user should still have permission to view entries
            ));
            ////////////////////////////////////////////////////////////////////////
            // Change the site to "private" mode:
            await graph.runAsSystem(UpdateSite({key: siteId, accessMode: AccessMode.Private}));

            assert.isFalse(await graph.read(async tx =>
                CheckSiteIsPublic({tx, siteId})  // This is now false
            ));
            assert.isFalse(await graph.read(async tx =>
                CheckSiteIsPublicContributions({tx, siteId})  // This is still false
            ));
            assert.isFalse(await graph.read(async tx =>
                CanViewEntries({tx, siteId})  // Now an anonymous user will not have permission to view entries
            ));
        });

        test(`check permissions granted via groups`, async () => {

            const siteId = defaultData.site.id;

            // "Alex" is in the administrators group so can edit site settings:
            assert.isTrue(await graph.read(async tx =>
                CanEditSiteSettings({userId: defaultData.users.alex.id, tx, siteId})
            ));
            // Whereas Jamie is in the users group so cannot:
            assert.isFalse(await graph.read(async tx =>
                CanEditSiteSettings({userId: defaultData.users.jamie.id, tx, siteId})
            ));
        });

    });
});
