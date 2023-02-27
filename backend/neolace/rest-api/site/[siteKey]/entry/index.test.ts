import {
    assertEquals,
    assertRejects,
    getClient,
    getSystemClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";

group("entry/index.ts", () => {
    group("Get entries list API", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const genusEntryType = defaultData.schema.entryTypes.ETGENUS;

        test("Count the total number of entries", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntries();
            const entries = [];
            for await (const x of result) entries.push(x);

            assertEquals(result.totalCount, Object.keys(defaultData.entries).length);
            assertEquals(result.totalCount, entries.length);
        });

        test("Get all entries of a specific type", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            // Get all entries of type "genus"
            const result = await client.getEntries({ ofEntryType: genusEntryType.key });
            const entries = [];
            for await (const x of result) entries.push(x);

            const c = defaultData.entries.genusCupressus;
            const p = defaultData.entries.genusPinus;
            const t = defaultData.entries.genusThuja;

            const expected = [
                { id: t.id, entryType: { key: genusEntryType.key }, name: t.name, key: t.key },
                { id: p.id, entryType: { key: genusEntryType.key }, name: p.name, key: p.key },
                { id: c.id, entryType: { key: genusEntryType.key }, name: c.name, key: c.key },
            ];

            // bug: https://github.com/denoland/deno_std/issues/2295
            // assertEquals(new Set(entries), new Set(expected)); // Order may vary as the API sorts by ID and the VNIDs are different on each test run
            entries.sort((a, b) => a.name.localeCompare(b.name));
            expected.sort((a, b) => a.name.localeCompare(b.name));
            assertEquals(entries, expected);
            // ^ use the above three lines until the bug in deno_std is fixed.

            assertEquals(result.totalCount, expected.length);
        });
    });
    group("Erase all entries API", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
        const siteKey = defaultData.site.key; // The API client uses keys as site identifiers, not VNID

        test("Does not erase entries without confirmation", async () => {
            const client = await getSystemClient();
            await assertRejects(
                () => client.eraseAllEntriesDangerously({ siteKey }), // Missing "confirm: danger",
                SDK.InvalidRequest,
            );
            assertEquals((await client.getEntries({ siteKey })).totalCount, Object.keys(defaultData.entries).length);
        });

        test("Can erase all entries", async () => {
            const client = await getSystemClient();
            assertEquals((await client.getEntries({ siteKey })).totalCount, Object.keys(defaultData.entries).length);
            await client.eraseAllEntriesDangerously({ siteKey, confirm: "danger" });
            assertEquals((await client.getEntries({ siteKey })).totalCount, 0);
        });
    });
});
