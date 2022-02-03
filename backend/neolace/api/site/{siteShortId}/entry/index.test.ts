import { assertEquals, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";

group(import.meta, () => {
    group("Get entries list API", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const genusEntryType = defaultData.schema.entryTypes._ETGENUS;

        test("Count the total number of entries", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntries();
            const entries = [];
            for await (const x of result) entries.push(x);

            assertEquals(result.totalCount, Object.keys(defaultData.entries).length);
            assertEquals(result.totalCount, entries.length);
        });

        test("Get all entries of a specific type", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            // Get all entries of type "genus"
            const result = await client.getEntries({ ofEntryType: genusEntryType.id });
            const entries = [];
            for await (const x of result) entries.push(x);

            const c = defaultData.entries.genusCupressus;
            const p = defaultData.entries.genusPinus;
            const t = defaultData.entries.genusThuja;

            const expected = [
                { id: t.id, type: { id: genusEntryType.id }, name: t.name, friendlyId: t.friendlyId },
                { id: p.id, type: { id: genusEntryType.id }, name: p.name, friendlyId: p.friendlyId },
                { id: c.id, type: { id: genusEntryType.id }, name: c.name, friendlyId: c.friendlyId },
            ];

            assertEquals(entries, expected);
            assertEquals(result.totalCount, expected.length);
        });
    });
});
