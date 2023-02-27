import { C, Field, VNID } from "neolace/deps/vertex-framework.ts";
import * as SDK from "neolace/deps/neolace-sdk.ts";
import {
    assert,
    assertEquals,
    assertInstanceOf,
    beforeAll,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { getConnection } from "../edit/connections.ts";
import { ApplyBulkEdits } from "../edit/ApplyBulkEdits.ts";
import { EntryValue, IntegerValue, PageValue } from "./values.ts";
import { ReferenceCache } from "../entry/reference-cache.ts";
import { LookupContext } from "./context.ts";

/**
 * These tests ensure that our lookup queries as as optimized as possible, using a moderately large data set.
 * They are all in this one file because loading the data to run the tests can take a while, so it's more efficient to
 * load the large data set once, then do all the performance tests.
 */
group("performance.test.ts", () => {
    setTestIsolation(setTestIsolation.levels.BLANK_NO_ISOLATION);

    const siteId = VNID();
    let context: TestLookupContext;
    const entryTypeA = "et-a";
    const entryTypeB = "et-b";
    const entryTypeC = "et-c";
    const numEntriesEachType = 10_000;
    beforeAll(async () => {
        const graph = await getGraph();
        await graph.runAsSystem(
            CreateSite({
                id: siteId,
                name: "Performance Test Site",
                domain: "lookup-perf-site.neolace.net",
                key: "perf",
            }),
        );
        context = new TestLookupContext({ siteId });

        // Create the entry types:
        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeA, name: "EntryType A" } },
                { code: "CreateEntryType", data: { key: entryTypeB, name: "EntryType B" } },
                { code: "CreateEntryType", data: { key: entryTypeC, name: "EntryType C" } },
            ],
            editSource: UseSystemSource,
        }));

        // Bulk load some data:
        const connection = await getConnection({ key: "perf", siteId, create: true, plugin: "none" });
        for (const entryTypeKey of [entryTypeA, entryTypeB, entryTypeC]) {
            const stepSize = 200;
            for (let i = 0; i < numEntriesEachType; i += stepSize) {
                const edits: SDK.AnyBulkEdit[] = [];
                for (let j = 0; j < stepSize; j++) {
                    const entryNum = i * stepSize + j;
                    edits.push({
                        code: "UpsertEntryByKey",
                        data: {
                            where: { entryTypeKey, entryKey: `${entryTypeKey}-e-${entryNum}` },
                            set: { name: `Entry ${entryNum}`, description: "This is an entry." },
                        },
                    });
                }
                await graph.runAsSystem(ApplyBulkEdits({ siteId, edits, connectionId: connection.id }));
            }
        }

        // Create another site so there's additional, unused data that we need to be sure to exclude:
        const otherSiteId = VNID();
        await graph.runAsSystem(
            CreateSite({ id: otherSiteId, name: "Excluded Site", domain: "excluded.neolace.net", key: "other" }),
        );
        const otherTypeKey = "x-type";
        await graph.runAsSystem(ApplyEdits({
            siteId: otherSiteId,
            edits: [{ code: "CreateEntryType", data: { key: otherTypeKey, name: "Other Type to be Ignored" } }],
            editSource: UseSystemSource,
        }));

        // Bulk load some data:
        const otherConnection = await getConnection({ key: "perf", siteId: otherSiteId, create: true, plugin: "none" });
        const stepSize = 200;
        for (let i = 0; i < 5_000; i += stepSize) {
            const edits: SDK.AnyBulkEdit[] = [];
            for (let j = 0; j < stepSize; j++) {
                const entryNum = i * stepSize + j;
                edits.push({
                    code: "UpsertEntryByKey",
                    data: {
                        where: { entryTypeKey: otherTypeKey, entryKey: `x-e-${entryNum}` },
                        set: { name: `Entry ${entryNum}`, description: "This is an entry." },
                    },
                });
            }
            await graph.runAsSystem(ApplyBulkEdits({ siteId: otherSiteId, edits, connectionId: otherConnection.id }));
        }
    });

    test("Perf - get the count of all entries from a site", async () => {
        const graph = await getGraph();

        const expectedTotalEntries = 3 * numEntriesEachType;

        // First, compute the result using an ideal hand-crafted query:
        graph.startProfile();
        const directResult = await graph.read((tx) =>
            tx.queryOne(C`
                MATCH (entry:Entry:VNode)-[:IS_OF_TYPE]->(:EntryType:VNode)-[:FOR_SITE]->(site:Site:VNode {key: "perf"})
            `.RETURN({ "count(entry)": Field.Int }))
        );
        // TODO: This query uses 30k dbHits less if we remove the :VNode constraint from (entry:Entry:VNode).
        // But that seems like a bad idea as we won't have an index on the .id property for the rest of the query.
        const directProfile = graph.finishProfile();
        assertEquals(directResult["count(entry)"], expectedTotalEntries);

        // Now, use a lookup function to compute the result:
        graph.startProfile();
        const lookupResult = await context.evaluateExprConcrete(`allEntries().count()`);
        const lookupProfile = graph.finishProfile();
        assertInstanceOf(lookupResult, IntegerValue);
        assertEquals(lookupResult.value, BigInt(expectedTotalEntries));

        // The lookup function should be no more complex than the manual query, other than ~5 extra dbHits for
        // permissions checks and other overhead.
        assertEquals(directProfile.dbHits, 90_030);
        assertEquals(lookupProfile.dbHits, directProfile.dbHits + 5);
    });

    test("Perf - get the count of all entries of a particular type from a site", async () => {
        const graph = await getGraph();

        const expectedCount = numEntriesEachType;

        // First, compute the result using an ideal hand-crafted query:
        graph.startProfile();
        const directResult = await graph.read((tx) =>
            tx.queryOne(C`
                MATCH (entry:Entry:VNode)-[:IS_OF_TYPE]->(entryType:EntryType:VNode)-[:FOR_SITE]->(site:Site:VNode {key: "perf"})
                WHERE entryType.key = ${entryTypeB}
            `.RETURN({ "count(entry)": Field.Int }))
        );
        const directProfile = graph.finishProfile();
        assertEquals(directResult["count(entry)"], expectedCount);

        // Now, use a lookup function to compute the result:
        graph.startProfile();
        const lookupResult = await context.evaluateExprConcrete(
            `allEntries().filter(entryType=entryType("${entryTypeB}")).count()`,
        );
        const lookupProfile = graph.finishProfile();
        assertInstanceOf(lookupResult, IntegerValue);
        assertEquals(lookupResult.value, BigInt(expectedCount));

        // The lookup function should be no more complex than the manual query, other than ~13 extra dbHits for
        // permissions checks, entry type validation, and other overhead.
        assertEquals(directProfile.dbHits, 30_023);
        assertEquals(lookupProfile.dbHits, directProfile.dbHits + 13);
    });

    async function entryPageTest(pageNum: number, pageSize: number) {
        const graph = await getGraph();

        // First, compute the result using an ideal hand-crafted query:
        graph.startProfile();
        const directResult = await graph.read((tx) =>
            tx.query(C`
                MATCH (entry:Entry:VNode)-[:IS_OF_TYPE]->(entryType:EntryType:VNode)-[:FOR_SITE]->(site:Site:VNode {key: "perf"})
                WHERE entryType.key = ${entryTypeB}
                WITH collect(entry) AS entries, count(entry) AS totalCount
                UNWIND entries AS entry
                RETURN entry.id, totalCount ORDER BY entry.name, id(entry) SKIP ${
                C(String(pageNum * pageSize))
            } LIMIT ${C(String(pageSize))}
            `.givesShape({ "entry.id": Field.VNID, "totalCount": Field.Int }))
        );
        const directProfile = graph.finishProfile();
        assertEquals(directResult[0].totalCount, numEntriesEachType);

        // Now, use a lookup function to compute the result:
        graph.startProfile();
        const lookupResult = await context.evaluateExprConcrete(
            `allEntries().filter(entryType=entryType("${entryTypeB}")).slice(start=${(pageNum *
                pageSize)}, size=${pageSize})`,
        );
        const lookupProfile = graph.finishProfile();
        assertInstanceOf(lookupResult, PageValue);
        assertInstanceOf(lookupResult.values[0], EntryValue);
        assertInstanceOf(lookupResult.values[1], EntryValue);
        assertEquals(lookupResult.values.length, 20);
        assertEquals(lookupResult.totalCount, BigInt(numEntriesEachType));

        // The results should be the same:
        assertEquals(directResult[0]["entry.id"], lookupResult.values[0].id);
        assertEquals(directResult[1]["entry.id"], lookupResult.values[1].id);
        return { directProfile, lookupProfile };
    }

    test("Perf - get the first page of all entries of a particular type, ordered by name.", async () => {
        const { directProfile, lookupProfile } = await entryPageTest(0, 20);
        assertEquals(directProfile.dbHits, 40_043);
        assertEquals(lookupProfile.dbHits, directProfile.dbHits + 13);
    });

    test("Perf - get the two hundredth page of all entries of a particular type, ordered by name.", async () => {
        const { directProfile, lookupProfile } = await entryPageTest(199, 20);
        assertEquals(directProfile.dbHits, 40_043);
        assertEquals(lookupProfile.dbHits, directProfile.dbHits + 13);
    });

    test("Perf - get the ReferenceCache data about some entries", async () => {
        const graph = await getGraph();
        const lookupResult = await context.evaluateExprConcrete(
            `allEntries().filter(entryType=entryType("${entryTypeB}"))`,
        );
        assertInstanceOf(lookupResult, PageValue);
        assertInstanceOf(lookupResult.values[0], EntryValue);
        assertEquals(lookupResult.values.length, 10);

        const refCache = new ReferenceCache({ siteId });
        refCache.extractLookupReferences(lookupResult.toJSON(), {});

        graph.startProfile("full");
        const result = await graph.read(async (tx) => {
            const lookupContext = new LookupContext({ tx, siteId });
            return refCache.getData(lookupContext);
        });
        const lookupProfile = graph.finishProfile();

        assertEquals(Object.keys(result.entries).length, lookupResult.values.length);
        assertEquals(result.entries[lookupResult.values[0].id].name, "Entry 0");
        assert(
            lookupProfile.dbHits < 200,
            `Expected refCache getData() to take < 200 dbHits, but it took ${lookupProfile.dbHits}`,
        );
    });
});
