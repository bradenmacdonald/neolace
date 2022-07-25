import {
    assertEquals,
    assertInstanceOf,
    createUserWithPermissions,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { EntryValue, IntegerValue, MakeAnnotatedEntryValue, PageValue, PropertyValue } from "../../values.ts";
import { ReverseProperty } from "./reverse.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { Always, EntryTypesCondition, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { getGraph } from "neolace/core/graph.ts";

group("reverse.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const context = new TestLookupContext({ siteId });

    // Literal expressions referencing some properties in the default PlantDB data set:
    const partIsAPart = new LiteralExpression(new PropertyValue(defaultData.schema.properties._partIsAPart.id));

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
    };

    test(`Can reverse a simple IS A relationship property value`, async () => {
        const expression = new ReverseProperty(new This(), { prop: partIsAPart });
        const value = await context.evaluateExprConcrete(expression, cone);
        // A "seed cone" and a "pollen cone" are both a "cone", so we should get them
        // by reversing the "IS A" relationship on "cone"
        assertEquals(
            value,
            new PageValue([
                MakeAnnotatedEntryValue(pollenCone, { ...defaultAnnotations }),
                MakeAnnotatedEntryValue(seedCone, { ...defaultAnnotations }),
            ], {
                pageSize: 10n,
                startedAt: 0n,
                totalCount: 2n,
                sourceExpression: expression,
                sourceExpressionEntryId: cone,
            }),
        );
    });
});

group("reverse.ts - permissions", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId });

    // Literal expressions referencing some properties in the default PlantDB data set:
    const genusPinus = new LiteralExpression(new EntryValue(defaultData.entries.genusPinus.id));
    const parentGenus = new LiteralExpression(new PropertyValue(defaultData.schema.properties._parentGenus.id));

    test(`It enforces permissions`, async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            key: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));

        // So: (Ponderosa Pine) -[ IS A MEMBER OF GENUS ]-> (Pinus)
        // That means if we reverse 'parentGenus' on 'Pinus', we should get 'Ponderosa Pine' and other species like it.
        // However, it requires that one has 'view property' of Ponderosa Pine (since "Parent Genus" is a property of
        // Species Entry Types), and that one has 'view entry' for Ponderosa Pine.

        // this.get(prop=[parent genus])
        {
            const expression = new ReverseProperty(genusPinus, { prop: parentGenus });

            // A user who is not logged in at all:
            {
                const result = await context.evaluateExprConcrete(expression);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view entries, view properties of Genus, but not view properties of Species.
            // This user shouldn't be able to reverse the property because they need 'view properties' on species to
            // see the 'parent genus' value of the ponderosa species.
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [
                        corePerm.viewSite.name,
                        corePerm.viewSchema.name,
                        corePerm.viewEntry.name,
                    ]),
                    new PermissionGrant(new EntryTypesCondition([defaultData.schema.entryTypes._ETGENUS.id]), [
                        corePerm.viewEntryProperty.name,
                    ]),
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view properties of species and view genus entries. This should work:
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [
                        corePerm.viewSite.name,
                        corePerm.viewSchema.name,
                    ]),
                    new PermissionGrant(new EntryTypesCondition([defaultData.schema.entryTypes._ETSPECIES.id]), [
                        corePerm.viewEntry.name,
                        corePerm.viewEntryProperty.name,
                    ]),
                    new PermissionGrant(new EntryTypesCondition([defaultData.schema.entryTypes._ETGENUS.id]), [
                        corePerm.viewEntry.name,
                    ]),
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 8);
            }
        }
    });
});
