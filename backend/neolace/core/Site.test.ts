import { log } from "../api";
import { suite, test, assert, beforeEach, setTestIsolation, assertRejects } from "../lib/intern-tests";
import { graph } from "./graph";
import { CreateSite, Site, testExports } from "./Site";
import { CreateUser } from "./User";

suite(__filename, () => {

    suite("site codes - siteCodeFromNumber", () => {

        const {siteCodeFromNumber, siteCodesMaxCount} = testExports;

        test("has 901 million+ possibilities", () => {
            assert.strictEqual(siteCodesMaxCount, 901_356_496);
        });

        test("starts with codes like 00000, 00001, 00002, ...", () => {
            assert.equal(siteCodeFromNumber(0), "00000");
            assert.equal(siteCodeFromNumber(1), "00001");
            assert.equal(siteCodeFromNumber(2), "00002");
        });

        test("ends with codes yzzzx, yzzzy, yzzzz", () => {
            assert.equal(siteCodeFromNumber(siteCodesMaxCount - 3), "yzzzx");
            assert.equal(siteCodeFromNumber(siteCodesMaxCount - 2), "yzzzy");
            assert.equal(siteCodeFromNumber(siteCodesMaxCount - 1), "yzzzz");
        });

        test("gives expected results from certain values", () => {
            assert.strictEqual(siteCodeFromNumber(7268454), "0UUr8");
        });

        test("rejects out of range values", () => {
            assert.throws(() => siteCodeFromNumber(-1));
            assert.throws(() => siteCodeFromNumber(siteCodesMaxCount));
            assert.throws(() => siteCodeFromNumber(siteCodesMaxCount + 4_000));
            assert.throws(() => siteCodeFromNumber(NaN));
        });
    });

    suite("CreateSite", () => {

        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        // Note: CreateSite is mostly tested via the REST API tests, but there are some low-level tests here
        // for things that are easier to test at this level (like specific site code tests)

        test("Can create a Site with a specific values, including site code", async () => {
            const result = await graph.runAsSystem(CreateSite({siteCode: "ABC10", slugId: "site-test1", domain: "test.neolace.net"}));
            assert.equal(result.siteCode, "ABC10");
            const result2 = await graph.pullOne(Site, s => s.slugId.domain.siteCode);
            assert.strictEqual(result2.slugId, "site-test1");
            assert.strictEqual(result2.siteCode, "ABC10");
            assert.strictEqual(result2.domain, "test.neolace.net");
        });

        test("Cannot create two sites with the same site code", async () => {
            const result = await graph.runAsSystem(CreateSite({siteCode: "ABC10", slugId: "site-test1", domain: "test.neolace.net"}));
            assert.equal(result.siteCode, "ABC10");
            await assertRejects(
                graph.runAsSystem(CreateSite({siteCode: "ABC10", slugId: "site-test2", domain: "test2.neolace.net"})),
                "already exists with label `Site` and property `siteCode` = 'ABC10'",
            );
        });

        test("Can create Sites with auto-generated random site code", async () => {
            const result1 = await graph.runAsSystem(CreateSite({slugId: "site-test1", domain: "test1.neolace.net"}));
            assert.isString(result1.siteCode);
            assert.lengthOf(result1.siteCode, 5);

            const result2 = await graph.runAsSystem(CreateSite({slugId: "site-test2", domain: "test2.neolace.net"}));
            assert.isString(result2.siteCode);
            assert.lengthOf(result2.siteCode, 5);

            assert.notStrictEqual(result1.siteCode, result2.siteCode);

            // Now generate 300 more sites and make sure they all have unique, auto-generated site codes:
            const siteCodesUsed = new Set<string>();
            for (let i = 0; i < 300; i++) {
                return graph.runAsSystem(CreateSite({
                    slugId: `site-test-3-${i}`,
                    domain: `test${i}.neolace.net`
                })).then(s => { siteCodesUsed.add(s.siteCode); })
            }
            assert.strictEqual(siteCodesUsed.size, 300);
        });

        test("Can create Sites with a default administrators group", async () => {
            // Create a user:
            const jamie = await graph.runAsSystem(CreateUser({
                email: "jamie@neolace.net",
                fullName: "Jamie Admin",
            }));
            // Create a site, specifying that user as the new administrator:
            await graph.runAsSystem(CreateSite({
                slugId: "site-test1",
                domain: "test1.neolace.net",
                description: "A site managed by Jamie",
                adminUser: jamie.id,
            }));
            // Read the resulting site and its groups:
            const siteResult = await graph.pullOne(Site, s => s.groupsFlat(g => g.allProps), {key: "site-test1"});
            assert.strictEqual(siteResult.groupsFlat.length, 1);
            assert.strictEqual(siteResult.groupsFlat[0].name, "Administrators");
            assert.strictEqual(siteResult.groupsFlat[0].administerSite, true);
        });
    });
});
