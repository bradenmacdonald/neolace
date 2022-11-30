import {
    assertEquals,
    assertInstanceOf,
    assertRejects,
    createUserWithPermissions,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { BooleanValue, EntryTypeValue, EntryValue, PageValue, PropertyValue, StringValue } from "../../values.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { Always, EntryTypesCondition, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { BasicSearch } from "./basicSearch.ts";
import { getGraph } from "neolace/core/graph.ts";

group("basicSearch.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, defaultPageSize: 5n });

    test(`It can match on entry names (case insensitive)`, async () => {
        // basicSearch("pINe")
        const expr = new BasicSearch(new LiteralExpression(new StringValue("pINe")));

        const result = await context.evaluateExprConcrete(expr);
        assertEquals(
            result,
            new PageValue([
                // These are currently the first five entries with "pine" in their name in the default PlantDB data set,
                // in alphabetical order:
                new EntryValue(defaultData.entries.jackPine.id),
                new EntryValue(defaultData.entries.japaneseRedPine.id),
                new EntryValue(defaultData.entries.japaneseWhitePine.id),
                new EntryValue(defaultData.entries.jeffreyPine.id),
                new EntryValue(defaultData.entries.pinyonPine.id),
            ], {
                pageSize: 5n,
                startedAt: 0n,
                totalCount: 9n,
                sourceExpression: expr,
                sourceExpressionEntryId: undefined,
            }),
        );
    });

    test(`It can match on entry keys (case insensitive)`, async () => {
        // basicSearch("Pinus-P")
        const expr = new BasicSearch(new LiteralExpression(new StringValue("Pinus-P")));

        const result = await context.evaluateExprConcrete(expr);
        assertEquals(
            result,
            new PageValue([
                // These are currently the only three entries with "pinus-p" in their key:
                new EntryValue(defaultData.entries.japaneseWhitePine.id), // key: "s-pinus-parviflora"
                new EntryValue(defaultData.entries.ponderosaPine.id), // key: "s-pinus-ponderosa"
                new EntryValue(defaultData.entries.stonePine.id), // key: "s-pinus-pinea"
            ], {
                pageSize: 5n,
                startedAt: 0n,
                totalCount: 3n,
                sourceExpression: expr,
                sourceExpressionEntryId: undefined,
            }),
        );
    });

    test(`It can match on property names (case insensitive)`, async () => {
        // basicSearch("NAME")
        const expr = new BasicSearch(new LiteralExpression(new StringValue("NAME")));

        const result = await context.evaluateExprConcrete(expr);
        assertEquals(
            result,
            new PageValue([
                // These are currently the only two properties with "name" in their property name:
                new PropertyValue(defaultData.schema.properties.propOtherNames.key),
                new PropertyValue(defaultData.schema.properties.propScientificName.key),
            ], {
                pageSize: 5n,
                startedAt: 0n,
                totalCount: 2n,
                sourceExpression: expr,
                sourceExpressionEntryId: undefined,
            }),
        );
    });

    test(`It can match on entry type names (case insensitive)`, async () => {
        // basicSearch("species")
        const expr = new BasicSearch(new LiteralExpression(new StringValue("species")));

        const result = await context.evaluateExprConcrete(expr);
        assertEquals(
            result,
            new PageValue([
                // In this case, we match both an entry type and a property:
                new EntryTypeValue(defaultData.schema.entryTypes.ETSPECIES.key),
                new PropertyValue(defaultData.schema.properties.genusSpecies.key),
            ], {
                pageSize: 5n,
                startedAt: 0n,
                totalCount: 2n,
                sourceExpression: expr,
                sourceExpressionEntryId: undefined,
            }),
        );
    });

    test(`It gives an error message when given a non-string`, async () => {
        const expression = new BasicSearch(new LiteralExpression(new BooleanValue(false)));

        await assertRejects(
            () => context.evaluateExpr(expression),
            LookupEvaluationError,
            `The expression "false" is not of the right type.`,
        );
    });

    test(`toString()`, async () => {
        assertEquals(new BasicSearch(new LiteralExpression(new StringValue("foo"))).toString(), `basicSearch("foo")`);
    });
});

group("basicSearch.ts - permissions", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, defaultPageSize: 5n });

    test(`It enforces permissions`, async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            id: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));

        // First, test this search, which will return schema results:
        // basicSearch("species")
        {
            const expression = new BasicSearch(new LiteralExpression(new StringValue("species")));

            // A user who is not logged in at all:
            {
                const result = await context.evaluateExprConcrete(expression);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view the schema:
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [corePerm.viewSite.name, corePerm.viewSchema.name]),
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, PageValue);
                assertEquals(
                    result,
                    new PageValue([
                        // In this case, we match both an entry type and a property:
                        new EntryTypeValue(defaultData.schema.entryTypes.ETSPECIES.key),
                        new PropertyValue(defaultData.schema.properties.genusSpecies.key),
                    ], {
                        pageSize: 5n,
                        startedAt: 0n,
                        totalCount: 2n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: undefined,
                    }),
                );
            }
        }

        // Now test a search for entries:
        // basicSearch("pin")
        {
            const expression = new BasicSearch(new LiteralExpression(new StringValue("pin")));

            // A user who is not logged in at all:
            {
                const result = await context.evaluateExprConcrete(expression);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view *genus* and *order* entries only:
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(
                        new EntryTypesCondition([
                            defaultData.schema.entryTypes.ETGENUS.key,
                            defaultData.schema.entryTypes.ETORDER.key,
                        ]),
                        [corePerm.viewSite.name, corePerm.viewEntry.name],
                    ),
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, PageValue);
                assertEquals(
                    result,
                    new PageValue([
                        new EntryValue(defaultData.entries.orderPinales.id),
                        new EntryValue(defaultData.entries.genusPinus.id),
                        // Not matched due to permissions: "pinyonPine", "familyPinaceae", etc.
                    ], {
                        pageSize: 5n,
                        startedAt: 0n,
                        totalCount: 2n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: undefined,
                    }),
                );
            }
        }
    });
});
