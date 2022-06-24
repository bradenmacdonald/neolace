import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { EntryTypeValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { EntryTypeFunction } from "./entryType.ts";
import { This } from "../this.ts";

group("entryType.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Can look up an entry type by VNID", async () => {
        assertEquals(
            await context.evaluateExpr(`entryType("${defaultData.schema.entryTypes._ETSPECIES.id}")`, undefined),
            new EntryTypeValue(defaultData.schema.entryTypes._ETSPECIES.id),
        );
    });

    test("Can look up an entry type from an entry", async () => {
        assertEquals(
            await context.evaluateExpr(new EntryTypeFunction(new This()), defaultData.entries.classPinopsida.id),
            new EntryTypeValue(defaultData.schema.entryTypes._ETCLASS.id),
        );
    });

    test("Does not return entry types from other sites", async () => {
        const graph = await getGraph();

        // Create another site with three entries:
        const otherSiteId = VNID(), entryType = VNID(), A = VNID();
        await graph.runAsSystem(
            CreateSite({ id: otherSiteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test" }),
        );
        await graph.runAsSystem(ApplyEdits({
            siteId: otherSiteId,
            edits: [
                { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                {
                    code: "CreateEntry",
                    data: { id: A, name: "Entry A", type: entryType, friendlyId: "a", description: "" },
                },
            ],
        }));

        const otherSiteContext = new TestLookupContext({ siteId: otherSiteId });

        const expr = `entryType("${defaultData.schema.entryTypes._ETSPECIES.id}")`;
        assertEquals(
            await context.evaluateExpr(expr, undefined),
            new EntryTypeValue(defaultData.schema.entryTypes._ETSPECIES.id),
        );
        await assertRejects(
            () => otherSiteContext.evaluateExpr(expr, undefined),
            LookupEvaluationError,
            "Entry Type not found.",
        );
    });
});
