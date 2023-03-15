/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
        const otherSiteId = VNID(), entryTypeKey = "et-test", A = VNID(), B = VNID(), C = VNID();
        await graph.runAsSystem(
            CreateSite({ id: otherSiteId, name: "Test Site", domain: "test-site.neolace.net", key: "test" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId: otherSiteId,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                {
                    code: "CreateEntry",
                    data: { entryId: A, name: "Entry A", entryTypeKey, key: "a", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: B, name: "Entry B", entryTypeKey, key: "b", description: "" },
                },
                {
                    code: "CreateEntry",
                    data: { entryId: C, name: "Entry C", entryTypeKey, key: "c", description: "" },
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
