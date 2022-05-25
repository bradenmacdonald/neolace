import { VNID } from "neolace/deps/vertex-framework.ts";
import {
    assert,
    assertEquals,
    assertRejects,
    assertStrictEquals,
    assertThrows,
    group,
    setTestIsolation,
    test,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite, Site, testExports } from "neolace/core/Site.ts";
import { CreateUser } from "neolace/core/User.ts";

group("Site.ts", () => {
    group("site codes - siteCodeFromNumber", () => {
        const { siteCodeFromNumber, siteCodesMaxCount } = testExports;

        test("has 901 million+ possibilities", () => {
            assertEquals(siteCodesMaxCount, 901_356_496);
        });

        test("starts with codes like 00000, 00001, 00002, ...", () => {
            assertEquals(siteCodeFromNumber(0), "00000");
            assertEquals(siteCodeFromNumber(1), "00001");
            assertEquals(siteCodeFromNumber(2), "00002");
        });

        test("ends with codes yzzzx, yzzzy, yzzzz", () => {
            assertEquals(siteCodeFromNumber(siteCodesMaxCount - 3), "yzzzx");
            assertEquals(siteCodeFromNumber(siteCodesMaxCount - 2), "yzzzy");
            assertEquals(siteCodeFromNumber(siteCodesMaxCount - 1), "yzzzz");
        });

        test("gives expected results from certain values", () => {
            assertEquals(siteCodeFromNumber(7268454), "0UUr8");
        });

        test("rejects out of range values", () => {
            assertThrows(() => siteCodeFromNumber(-1));
            assertThrows(() => siteCodeFromNumber(siteCodesMaxCount));
            assertThrows(() => siteCodeFromNumber(siteCodesMaxCount + 4_000));
            assertThrows(() => siteCodeFromNumber(NaN));
        });
    });

    group("CreateSite", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        // Note: CreateSite is mostly tested via the REST API tests, but there are some low-level tests here
        // for things that are easier to test at this level (like specific site code tests)

        test("Can create a Site with a specific values, including site code", async () => {
            const graph = await getGraph();
            const result = await graph.runAsSystem(
                CreateSite({ name: "Test Site", siteCode: "ABC10", slugId: "site-test1", domain: "test.neolace.net" }),
            );
            assertEquals(result.siteCode, "ABC10");
            const result2 = await graph.pullOne(Site, (s) => s.slugId.domain.siteCode);
            assertEquals(result2.slugId, "site-test1");
            assertEquals(result2.siteCode, "ABC10");
            assertEquals(result2.domain, "test.neolace.net");
        });

        test("Cannot create two sites with the same site code", async () => {
            const graph = await getGraph();
            const result = await graph.runAsSystem(
                CreateSite({ name: "Test Site", siteCode: "ABC10", slugId: "site-test1", domain: "test.neolace.net" }),
            );
            assertEquals(result.siteCode, "ABC10");
            await assertRejects(
                () =>
                    graph.runAsSystem(
                        CreateSite({
                            name: "Test Site",
                            siteCode: "ABC10",
                            slugId: "site-test2",
                            domain: "test2.neolace.net",
                        }),
                    ),
                undefined,
                "already exists with label `Site` and property `siteCode` = 'ABC10'",
            );
        });

        test("Can create Sites with auto-generated random site code", async () => {
            const graph = await getGraph();
            const result1 = await graph.runAsSystem(
                CreateSite({ name: "Test Site 1", slugId: "site-test1", domain: "test1.neolace.net" }),
            );
            assertEquals(typeof result1.siteCode, "string");
            assertEquals(result1.siteCode.length, 5);

            const result2 = await graph.runAsSystem(
                CreateSite({ name: "Test Site 2", slugId: "site-test2", domain: "test2.neolace.net" }),
            );
            assertEquals(typeof result2.siteCode, "string");
            assertEquals(result2.siteCode.length, 5);

            assert(result1.siteCode !== result2.siteCode);

            // Now generate 300 more sites and make sure they all have unique, auto-generated site codes:
            const siteCodesUsed = new Set<string>();
            for (let i = 0; i < 300; i++) {
                return graph.runAsSystem(CreateSite({
                    name: `Test Site ${i}`,
                    slugId: `site-test-3-${i}`,
                    domain: `test${i}.neolace.net`,
                })).then((s) => {
                    siteCodesUsed.add(s.siteCode);
                });
            }
            assertEquals(siteCodesUsed.size, 300);
        });

        test("Can create Sites with a default administrators group", async () => {
            const graph = await getGraph();
            // Create a user:
            const jamie = await graph.runAsSystem(CreateUser({
                id: VNID(),
                authnId: -1,
                email: "jamie@neolace.net",
                fullName: "Jamie Admin",
            }));
            // Create a site, specifying that user as the new administrator:
            await graph.runAsSystem(CreateSite({
                name: "Test Site",
                slugId: "site-test1",
                domain: "test1.neolace.net",
                description: "A site managed by Jamie",
                adminUser: jamie.id,
            }));
            // Read the resulting site and its groups:
            const siteResult = await graph.pullOne(Site, (s) => s.groupsFlat((g) => g.allProps), { key: "site-test1" });
            assertStrictEquals(siteResult.groupsFlat.length, 1);
            assertStrictEquals(siteResult.groupsFlat[0].name, "Administrators");
            assertStrictEquals(siteResult.groupsFlat[0].administerSite, true);
        });
    });
});
