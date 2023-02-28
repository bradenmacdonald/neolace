import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";

group("index.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

    const domain = "test.local.neolace.net";
    const name = "A New Test Site";
    const description = "Testing site creation";

    test("It can create a new site", async () => {
        const client = await getClient(defaultData.users.admin);
        // siteKey has to be different for each test as the siteKey->siteId cache isn't ever cleared.
        const siteKey = "new-test1";

        await client.createOrUpdateSite({
            siteKey,
            create: true,
            name,
            domain,
            description,
        });

        const siteDetails = await client.getSite({ domain });

        assertEquals(siteDetails.name, name);
        assertEquals(siteDetails.domain, domain);
        assertEquals(siteDetails.description, description);
    });

    test("It won't create a new site if create: is false or undefined", async () => {
        const client = await getClient(defaultData.users.admin);
        const siteKey = "new-test2";

        await assertRejects(() => {
            // create: is explicitly false:
            return client.createOrUpdateSite({ siteKey, create: false, name, domain, description });
        }, "That site doesn't exist. Set the 'create' parameter if you want to create it.");

        await assertRejects(() => {
            // create: is not set here
            return client.createOrUpdateSite({ siteKey, name, domain, description });
        }, "That site doesn't exist. Set the 'create' parameter if you want to create it.");
    });

    test("It can update a new site's core configuration", async () => {
        const client = await getClient(defaultData.users.admin);
        const siteKey = "new-test3";

        // First, create a site:
        await client.createOrUpdateSite({
            siteKey,
            create: true,
            name,
            domain,
            description,
        });

        // Then, change its name using the same API:
        const newName = "New Name";
        const newFooter = "This is the footer content";
        await client.createOrUpdateSite({
            siteKey,
            name: newName,
            // Domain and description unchanged
            footerContent: newFooter,
        });

        // Check that the specified fields changed, and the others did not:
        const siteDetails = await client.getSite({ domain });

        assertEquals(siteDetails.name, newName);
        assertEquals(siteDetails.domain, domain);
        assertEquals(siteDetails.description, description);
        assertEquals(siteDetails.footerContent, newFooter);
    });

    test("It won't create a new site if it already exists and createOnly is true", async () => {
        const client = await getClient(defaultData.users.admin);
        const siteKey = "new-test4";

        // First, create a site with createOnly: true:
        const doCreate = () => {
            return client.createOrUpdateSite({ siteKey, createOnly: true, name, domain, description });
        };
        // Now try creating the same site again, still with createOnly: true
        await doCreate();

        // Then, try creating again but with createOnly specified.
        const error = await assertRejects(doCreate);
        assertInstanceOf(error, SDK.InvalidRequest);
        assertEquals(error.reason, SDK.InvalidRequestReason.SiteAlreadyExists);
    });

    test("It can set default permissions", async () => {
        const client = await getClient(defaultData.users.admin);
        const anonClient = await getClient();
        const siteKeyA = "new-test5a";
        const siteKeyB = "new-test5b";
        const domainA = "a-test.local.neolace.net";
        const domainB = "b-test.local.neolace.net";

        // Create site A with public permissions:
        await client.createOrUpdateSite({
            siteKey: siteKeyA,
            createOnly: true,
            name: "SiteA",
            domain: domainA,
            accessMode: SDK.SiteAccessMode.PublicContributions,
        });

        // Create site B that's private:
        await client.createOrUpdateSite({
            siteKey: siteKeyB,
            createOnly: true,
            name: "SiteB",
            domain: domainB,
            accessMode: SDK.SiteAccessMode.Private,
        });

        // Now as an anonymous user we should be able to access A:
        await anonClient.getSiteHomePage({ siteKey: siteKeyA });
        await anonClient.evaluateLookupExpression(`allEntries().count()`, { siteKey: siteKeyA });
        // Now as an anonymous user we should be NOT able to access B:
        await assertRejects(() => anonClient.getSiteHomePage({ siteKey: siteKeyB }), SDK.NotAuthenticated);
        await assertRejects(
            () => anonClient.evaluateLookupExpression(`allEntries().count()`, { siteKey: siteKeyB }),
            SDK.NotAuthenticated,
        );
    });

    test("It gives an error if the domain is already taken", async () => {
        const client = await getClient(defaultData.users.admin);
        const siteKey = "new-test6";
        const siteKey2 = "new-test6b";

        // First, create a site:
        await client.createOrUpdateSite({ siteKey, create: true, name, domain, description });

        // Then, try creating a site with the same domain
        await assertRejects(
            () => client.createOrUpdateSite({ siteKey: siteKey2, create: true, name, domain, description }),
            SDK.InvalidFieldValue,
            "That domain is already used by another site.",
        );
    });

    test("Only admins can create a site", async () => {
        const anonClient = await getClient();
        const siteKey = "new-test7";

        // Then, try creating a site with the same domain
        await assertRejects(
            () => anonClient.createOrUpdateSite({ siteKey, create: true, name, domain, description }),
            SDK.NotAuthenticated,
        );

        // Same test with regular non-admin user:
        const client = await getClient(defaultData.users.regularUser, defaultData.site.key);
        await assertRejects(
            () => client.createOrUpdateSite({ siteKey, create: true, name, domain, description }),
            SDK.NotAuthorized,
        );
    });
});
