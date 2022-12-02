import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertRejects, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { EntryTypeValue, InlineMarkdownStringValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { EntryTypeFunction } from "./entryType.ts";
import { This } from "../this.ts";

group("entryType.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Can look up an entry type by key", async () => {
        assertEquals(
            await context.evaluateExpr(`entryType("${defaultData.schema.entryTypes.ETSPECIES.key}")`, undefined),
            new EntryTypeValue(defaultData.schema.entryTypes.ETSPECIES.key),
        );
    });

    test("Can look up an entry type from an entry", async () => {
        assertEquals(
            await context.evaluateExpr(new EntryTypeFunction(new This()), defaultData.entries.classPinopsida.id),
            new EntryTypeValue(defaultData.schema.entryTypes.ETCLASS.key),
        );
    });

    test("EntryType Values have a .name property", async () => {
        assertEquals(
            await context.evaluateExpr(`entryType("${defaultData.schema.entryTypes.ETSPECIES.key}").name`, undefined),
            new StringValue(defaultData.schema.entryTypes.ETSPECIES.name),
        );
    });

    test("EntryType Values have a .description property", async () => {
        assertEquals(
            await context.evaluateExpr(
                `entryType("${defaultData.schema.entryTypes.ETSPECIES.key}").description`,
                undefined,
            ),
            new InlineMarkdownStringValue(defaultData.schema.entryTypes.ETSPECIES.description),
        );
    });

    test("Does not return entry types from other sites", async () => {
        const graph = await getGraph();

        // Create another site with three entries:
        const otherSiteId = VNID(), entryTypeKey = "ET1", A = VNID();
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
            ],
            editSource: UseSystemSource,
        }));

        const otherSiteContext = new TestLookupContext({ siteId: otherSiteId });

        const expr = `entryType("${defaultData.schema.entryTypes.ETSPECIES.key}")`;
        assertEquals(
            await context.evaluateExpr(expr, undefined),
            new EntryTypeValue(defaultData.schema.entryTypes.ETSPECIES.key),
        );
        await assertRejects(
            () => otherSiteContext.evaluateExpr(expr, undefined),
            LookupEvaluationError,
            "Entry Type not found.",
        );
    });
});
