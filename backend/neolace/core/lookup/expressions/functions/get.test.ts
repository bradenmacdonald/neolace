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
import {
    AnnotatedValue,
    EntryValue,
    IntegerValue,
    MakeAnnotatedEntryValue,
    NullValue,
    PageValue,
    PropertyValue,
    StringValue,
} from "../../values.ts";
import { GetProperty } from "./get.ts";
import { This } from "../this.ts";
import { LiteralExpression } from "../literal-expr.ts";
import { AccessMode, UpdateSite } from "neolace/core/Site.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";
import { Always, EntryTypesCondition, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { getGraph } from "neolace/core/graph.ts";
import { LookupEvaluationError } from "../../errors.ts";
import { PropFunction } from "./prop.ts";

group("get.ts", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const cone = defaultData.entries.cone.id;
    const seedCone = defaultData.entries.seedCone.id;
    const pollenCone = defaultData.entries.pollenCone.id;
    const context = new TestLookupContext({ siteId });

    // Expressions referencing some properties in the default PlantDB data set:
    const makeProp = (id: string) => new PropFunction(new LiteralExpression(new StringValue(id)));
    const scientificName = makeProp(defaultData.schema.properties._propScientificName.id);
    const partIsAPart = makeProp(defaultData.schema.properties._partIsAPart.id);
    const hasPart = makeProp(defaultData.schema.properties._hasPart.id);
    const genusSpecies = makeProp(defaultData.schema.properties._genusSpecies.id);

    // When retrieving the entry values from a relationship property, they are "annotated" with data like this:
    const defaultAnnotations = {
        rank: new IntegerValue(1n),
    };

    group("get() - value property, single entry, single value", () => {
        test(`get() can retrieve a property value for a single entry`, async () => {
            const expression = new GetProperty(new This(), { prop: scientificName });
            const value = await context.evaluateExprConcrete(expression, defaultData.entries.ponderosaPine.id);

            assertEquals(value, new StringValue("Pinus ponderosa"));
        });

        test(`get() returns null if a property is not set`, async () => {
            const expression = new GetProperty(new This(), { prop: scientificName });
            // The entry "cone" doesn't have a scientific name set:
            const value = await context.evaluateExprConcrete(expression, defaultData.entries.cone.id);

            assertEquals(value, new NullValue());
        });
    });

    group("get() - value property, single entry, multiple values", () => {
        // TODO: implement this
    });

    group("get() - value property, multiple entries", () => {
        // TODO: implement this
    });

    group("get() - auto property", () => {
        test(`Can retrieve an automatically-computed reverse relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: genusSpecies });
            const value = await context.evaluateExprConcrete(expression, defaultData.entries.genusThuja.id);
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(defaultData.entries.westernRedcedar.id, { ...defaultAnnotations }),
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 1n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: defaultData.entries.genusThuja.id,
                }),
            );
        });
        test(`Can retrieve an automatically-computed reverse relationship property value without 'this' being set`, async () => {
            // Thuja.get(prop=parentGenus) when 'this' is not set should be equal to
            // this.get(prop=parentGenus)  when 'this' is Thuja.
            const expression1 = new GetProperty(
                new LiteralExpression(new EntryValue(defaultData.entries.genusThuja.id)),
                { prop: genusSpecies }, // This property in turn evalutes 'this.reverse(prop=prop("_parentGenus"))'
            );
            const expression2 = new GetProperty(new This(), { prop: genusSpecies });
            const value1 = await context.evaluateExprConcrete(expression1, undefined);
            const value2 = await context.evaluateExprConcrete(expression2, defaultData.entries.genusThuja.id);
            assertInstanceOf(value1, PageValue);
            assertInstanceOf(value2, PageValue);
            assertEquals(value1.values, value2.values);
            assertEquals(value1.sourceExpression, expression1);
            assertEquals(value2.sourceExpression, expression2);
        });
    });

    group("get() - relationship property", () => {
        test(`Can retrieve a simple IS A relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: partIsAPart });
            const value = await context.evaluateExprConcrete(expression, defaultData.entries.seedCone.id);
            // A "seed cone" is a "cone":
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(cone, { ...defaultAnnotations }),
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 1n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: defaultData.entries.seedCone.id,
                }),
            );
        });

        test(`Can retrieve a simple HAS PART relationship property value`, async () => {
            const expression = new GetProperty(new This(), { prop: hasPart });
            const value = await context.evaluateExprConcrete(expression, defaultData.entries.classPinopsida.id);
            // All conifers (Class Pinopsida) have both male and female cones:
            assertEquals(
                value,
                new PageValue([
                    MakeAnnotatedEntryValue(pollenCone, {
                        ...defaultAnnotations,
                        slot: new StringValue("pollen-cone"),
                    }),
                    MakeAnnotatedEntryValue(seedCone, {
                        ...defaultAnnotations,
                        slot: new StringValue("seed-cone"),
                        rank: new IntegerValue(2n),
                    }),
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: 2n,
                    sourceExpression: expression,
                    sourceExpressionEntryId: defaultData.entries.classPinopsida.id,
                }),
            );
        });
    });
});

group("get.ts - permissions", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const context = new TestLookupContext({ siteId, entryId: defaultData.entries.ponderosaPine.id });

    // Literal expressions referencing some properties in the default PlantDB data set:
    const scientificName = new LiteralExpression(
        new PropertyValue(defaultData.schema.properties._propScientificName.id),
    );
    const parentGenus = new LiteralExpression(new PropertyValue(defaultData.schema.properties._parentGenus.id));

    test(`It enforces permissions for basic property values`, async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            key: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));

        // One can only get a basic property value if one has 'view properties' permission
        // this.get(prop=[scientific name])
        {
            const expression = new GetProperty(new This(), { prop: scientificName });

            // A user who is not logged in at all:
            {
                await assertRejects(
                    () => context.evaluateExprConcrete(expression),
                    LookupEvaluationError,
                    "You do not have permission to view that property.",
                );
            }

            // A user with permission to view the site, entry and schema, but not "view properties":
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [
                        corePerm.viewSite.name,
                        corePerm.viewEntry.name,
                        corePerm.viewSchema.name,
                    ]),
                );
                await assertRejects(
                    () => context.evaluateExprConcrete(expression, undefined, user.userId),
                    LookupEvaluationError,
                    "You do not have permission to view that property.",
                );
            }

            // A user with "view properties" for "species" entries (and view entry etc. for all enrties):
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [
                        corePerm.viewSite.name,
                        corePerm.viewEntry.name,
                        corePerm.viewSchema.name,
                    ]),
                    new PermissionGrant(new EntryTypesCondition([defaultData.schema.entryTypes._ETSPECIES.id]), [
                        corePerm.viewEntryProperty.name,
                    ]),
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, StringValue);
                assertEquals(result.value, "Pinus ponderosa");
            }
        }
    });

    test(`It enforces permissions for relationship property values`, async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            key: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));

        // One can only get a relationship value if one has 'view properties' permission for the current entry and
        // 'view entry' for the related entry.

        // this.get(prop=[parent genus])
        {
            const expression = new GetProperty(new This(), { prop: parentGenus });

            // A user who is not logged in at all:
            {
                const result = await context.evaluateExprConcrete(expression);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view properties of species but not view genus entries:
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
                );
                const result = await context.evaluateExprConcrete(expression, undefined, user.userId);
                assertInstanceOf(result, PageValue);
                assertEquals(result.values.length, 0);
            }

            // A user with permission to view genus entries but not properties of species:
            {
                const user = await createUserWithPermissions(
                    new PermissionGrant(Always, [
                        corePerm.viewSite.name,
                        corePerm.viewSchema.name,
                        corePerm.viewEntry.name,
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
                assertEquals(result.values.length, 1);
                assertInstanceOf(result.values[0], AnnotatedValue);
                assertInstanceOf(result.values[0].value, EntryValue);
                assertEquals(result.values[0].value.id, defaultData.entries.genusPinus.id);
            }
        }
    });
});
