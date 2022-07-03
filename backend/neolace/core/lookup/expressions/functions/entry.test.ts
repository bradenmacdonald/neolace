import { VNID } from "neolace/deps/vertex-framework.ts";
import { assertEquals, assertRejects, createUserWithPermissions, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AccessMode, CreateSite, UpdateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Always, EntryTypesCondition, NotCondition, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { EntryValue, StringValue } from "../../values.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { EntryFunction } from "./entry.ts";
import { LiteralExpression } from "../literal-expr.ts";

group("entry.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const context = new TestLookupContext({ siteId: defaultData.site.id });

    test("Can look up an entry by VNID", async () => {
        assertEquals(
            await context.evaluateExpr(`entry("${defaultData.entries.ponderosaPine.id}")`, undefined),
            new EntryValue(defaultData.entries.ponderosaPine.id),
        );
    });

    test("Can look up an entry by friendlyId", async () => {
        assertEquals(
            await context.evaluateExpr(`entry("${defaultData.entries.ponderosaPine.friendlyId}")`, undefined),
            new EntryValue(defaultData.entries.ponderosaPine.id),
        );
    });

    test("Does not return entries from other sites", async () => {
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

        const expr = `entry("${defaultData.entries.japaneseRedPine.id}")`;
        assertEquals(
            await context.evaluateExpr(expr, undefined),
            new EntryValue(defaultData.entries.japaneseRedPine.id),
        );
        await assertRejects(
            () => otherSiteContext.evaluateExpr(expr, undefined),
            LookupEvaluationError,
            `Entry "${defaultData.entries.japaneseRedPine.id}" not found.`,
        );
    });
});

group("entry.ts - permissions", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, defaultPageSize: 5n });

    test(`It enforces permissions`, async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            key: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));

        // Now that the site is private, check user permissions
        {
            // entry("VNID") for ponderosa pine:
            const speciesByVNID = new EntryFunction(new LiteralExpression(new StringValue(
                defaultData.entries.ponderosaPine.id
            )));
            // entry("g-pinus"):
            const genusByFriendlyId = new EntryFunction(new LiteralExpression(new StringValue(
                defaultData.entries.genusPinus.friendlyId
            )));

            // A user who is not logged in at all should not be able to find the entry:
            {
                await assertRejects(
                    () => context.evaluateExprConcrete(speciesByVNID),
                    LookupEvaluationError,
                    `Entry "${defaultData.entries.ponderosaPine.id}" not found.`
                );
                await assertRejects(
                    () => context.evaluateExprConcrete(genusByFriendlyId),
                    LookupEvaluationError,
                    `Entry "${defaultData.entries.genusPinus.friendlyId}" not found.`
                );
            }

            // A user with permission to view the site and schema and other types of entries still should not see it:
            {
                const user = await createUserWithPermissions(
                    // This user can view the site and the schema:
                    new PermissionGrant(Always, [corePerm.viewSite.name, corePerm.viewSchema.name]),
                    // This user can view every entry type except "species":
                    new PermissionGrant(
                        new NotCondition(
                            new EntryTypesCondition([
                                defaultData.schema.entryTypes._ETSPECIES.id
                            ])
                        ),
                        [corePerm.viewEntry.name],
                    ),
                );
                await assertRejects(
                    () => context.evaluateExprConcrete(speciesByVNID, undefined, user.userId),
                    LookupEvaluationError,
                    `Entry "${defaultData.entries.ponderosaPine.id}" not found.`
                );
                // But they can see the genus entry:
                assertEquals(
                    await context.evaluateExprConcrete(genusByFriendlyId, undefined, user.userId),
                    new EntryValue(defaultData.entries.genusPinus.id),
                );
            }
        }
    });
});
