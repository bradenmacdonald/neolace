import { VNID } from "neolace/deps/vertex-framework.ts";
import { assert, assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { EntryValue, IntegerValue, PageValue } from "../../values.ts";
import { AllEntries } from "./allEntries.ts";

group("allEntries.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

    test("Gives all entries from a site", async () => {
        const graph = await getGraph();

        // Create another site with three entries:
        const otherSiteId = VNID(), entryType = VNID(), A = VNID(), B = VNID(), C = VNID();
        await graph.runAsSystem(
            CreateSite({ id: otherSiteId, name: "Test Site", domain: "test-site.neolace.net", friendlyId: "test" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId: otherSiteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                {
                    code: "CreateEntry",
                    data: { entryId: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: B, name: "Entry B", type: entryType, friendlyId: "b", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: C, name: "Entry C", type: entryType, friendlyId: "c", description: "" },
                },
            ],
            editSource: UseSystemSource,
        }));

        const plantDbContext = new TestLookupContext({ siteId: defaultData.site.id });
        const otherSiteContext = new TestLookupContext({ siteId: otherSiteId });

        const numPlantDbEntries = Object.keys(defaultData.entries).length;
        assertEquals(
            await plantDbContext.evaluateExprConcrete("allEntries().count()"),
            new IntegerValue(numPlantDbEntries),
        );
        assertEquals(
            await otherSiteContext.evaluateExprConcrete("allEntries().count()"),
            new IntegerValue(3),
        );
        const result = await otherSiteContext.evaluateExprConcrete(new AllEntries());
        assert(result instanceof PageValue);
        const IDs = result.values.map((v) => (v as EntryValue).id);
        assertEquals(IDs, [A, B, C]);
    });
});
