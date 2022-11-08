import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import { assertEquals, group, setTestIsolation, test, TestLookupContext } from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { AnnotatedValue, IntegerValue, MakeAnnotatedEntryValue, PageValue } from "../../values.ts";
import { This } from "../this.ts";
import { Count } from "./count.ts";
import { AndDescendants, Descendants } from "./descendants.ts";

group("descendants.ts", () => {
    group("descendants()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const familyPinaceae = defaultData.entries.familyPinaceae;
        const context = new TestLookupContext({ siteId, entryId: familyPinaceae.id, defaultPageSize: 5n });

        test(`toString()`, async () => {
            assertEquals((new Descendants(new This())).toString(), "this.descendants()");
        });

        test("It can give all the descendants of the family Pinaceae", async () => {
            const expression = new Descendants(new This());
            const value = await context.evaluateExprConcrete(expression);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        // The first four pine species, in alphabetical order:
                        MakeAnnotatedEntryValue(defaultData.entries.jackPine.id, { distance: new IntegerValue(2) }),
                        MakeAnnotatedEntryValue(defaultData.entries.japaneseRedPine.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.japaneseWhitePine.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.jeffreyPine.id, { distance: new IntegerValue(2) }),
                    ],
                    {
                        pageSize: 5n,
                        startedAt: 0n,
                        totalCount: 9n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: familyPinaceae.id,
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {
            const expression = new Count(new Descendants(new This()));
            const value = await context.evaluateExprConcrete(expression);

            assertEquals(value, new IntegerValue(9));
        });
    });

    group("andDescendants()", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const familyPinaceae = defaultData.entries.familyPinaceae;
        const context = new TestLookupContext({ siteId, defaultPageSize: 5n });

        test(`toString()`, async () => {
            assertEquals((new AndDescendants(new This())).toString(), "this.andDescendants()");
        });

        test("It can give all the descendants of the ponderosa pine", async () => {
            const expression = new AndDescendants(new This());
            const value = await context.evaluateExprConcrete(expression, familyPinaceae.id);

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id, {
                            distance: new IntegerValue(0),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id, { distance: new IntegerValue(1) }),
                        MakeAnnotatedEntryValue(defaultData.entries.jackPine.id, { distance: new IntegerValue(2) }),
                        MakeAnnotatedEntryValue(defaultData.entries.japaneseRedPine.id, {
                            distance: new IntegerValue(2),
                        }),
                        MakeAnnotatedEntryValue(defaultData.entries.japaneseWhitePine.id, {
                            distance: new IntegerValue(2),
                        }),
                    ],
                    {
                        pageSize: 5n,
                        startedAt: 0n,
                        totalCount: 10n,
                        sourceExpression: expression,
                        sourceExpressionEntryId: familyPinaceae.id,
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {
            const expression = new Count(new AndDescendants(new This()));
            const value = await context.evaluateExprConcrete(expression, familyPinaceae.id);

            assertEquals(value, new IntegerValue(10));
        });

        /* Not reliable on the low-powered GitHub Actions CI runners
        const maxTime = 40;
        test(`It executes in < ${maxTime}ms`, async () => {
            const expression = new AndDescendants(new This());

            const start = performance.now();
            await graph.read(tx =>
                expression.getValue({tx, siteId, entryId: familyPinaceae.id, defaultPageSize: 10n}).then(v => v.makeConcrete())
            );
            const end = performance.now();
            assert(end - start < maxTime, `Expected andDescendants() to take under ${maxTime}ms but it took ${end - start}ms.`);
        });
        */
    });

    group("descendants()/andDescendants() - additional tests", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        const siteId = VNID();
        const entryType = VNID(), entryIsA = VNID();
        const A = VNID(),
            B = VNID(),
            C = VNID(),
            D = VNID(),
            E = VNID(),
            F = VNID(),
            G = VNID(),
            H = VNID(),
            I = VNID();
        const context = new TestLookupContext({ siteId });

        const checkDescendants = async (entryId: VNID, expected: AnnotatedValue[]) => {
            // with descendants():
            const expr1 = new Descendants(new This());
            assertEquals(
                await context.evaluateExprConcrete(expr1, entryId),
                new PageValue([
                    ...expected,
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: BigInt(expected.length),
                    sourceExpression: expr1,
                    sourceExpressionEntryId: entryId,
                }),
            );

            // And with andDescendants():
            const expr2 = new AndDescendants(new This());
            assertEquals(
                await context.evaluateExprConcrete(expr2, entryId),
                new PageValue([
                    MakeAnnotatedEntryValue(entryId, { distance: new IntegerValue(0n) }),
                    ...expected,
                ], {
                    pageSize: 10n,
                    startedAt: 0n,
                    totalCount: BigInt(expected.length + 1),
                    sourceExpression: expr2,
                    sourceExpressionEntryId: entryId,
                }),
            );
        };

        test("Returns only the shortest distance to duplicate descendants", async () => {
            // Create this entry tree:
            //     A    B
            //    / \  /  \
            //   C   D     E
            //    \ /     /|
            //     F    /  |  G
            //      \ /    | /
            //       H     I

            const graph = await getGraph();
            await graph.runAsSystem(
                CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test" }),
            );
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                    {
                        code: "CreateProperty",
                        data: { id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryType }] },
                    },
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
                    {
                        code: "CreateEntry",
                        data: { entryId: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: E, name: "Entry E", type: entryType, friendlyId: "e", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: F, name: "Entry F", type: entryType, friendlyId: "f", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: G, name: "Entry G", type: entryType, friendlyId: "g", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: H, name: "Entry H", type: entryType, friendlyId: "h", description: "" },
                    },
                    {
                        code: "CreateEntry",
                        data: { entryId: I, name: "Entry I", type: entryType, friendlyId: "i", description: "" },
                    },
                    // C is a A
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: C,
                            valueExpression: `entry("${A}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a A
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: D,
                            valueExpression: `entry("${A}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a B
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: D,
                            valueExpression: `entry("${B}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // E is a B
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: E,
                            valueExpression: `entry("${B}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // F is a C
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: F,
                            valueExpression: `entry("${C}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // F is a D
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: F,
                            valueExpression: `entry("${D}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // H is a F
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: H,
                            valueExpression: `entry("${F}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // H is a E
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: H,
                            valueExpression: `entry("${E}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // I is a E
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: I,
                            valueExpression: `entry("${E}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // I is a G
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: I,
                            valueExpression: `entry("${G}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));

            // Check the descendants of F
            await checkDescendants(F, [
                // Expect one descendant, H:
                MakeAnnotatedEntryValue(H, { distance: new IntegerValue(1n) }),
            ]);

            // Check the descendants of A
            await checkDescendants(A, [
                // Expect 2 immediate descendants (C & D), plus F and H as distant descendants
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(D, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(F, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(H, { distance: new IntegerValue(3n) }),
            ]);

            // Check the descendants of B
            await checkDescendants(B, [
                // We should find that B has 5 descendants, and the distance from B to H is 2 not 3.
                MakeAnnotatedEntryValue(D, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(E, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(F, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(H, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(I, { distance: new IntegerValue(2n) }),
            ]);
        });

        test("Works despite cyclic relationships", async () => {
            // Create this entry tree:
            //     A
            //    / \
            //   B   C
            //    \ /
            //     D
            //      \
            //       A (same A as above)

            const graph = await getGraph();
            await graph.runAsSystem(
                CreateSite({ id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test" }),
            );
            await graph.runAsSystem(ApplyEdits({
                siteId,
                edits: [
                    { code: "CreateEntryType", data: { id: entryType, name: "EntryType" } },
                    {
                        code: "CreateProperty",
                        data: { id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryType }] },
                    },
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
                    {
                        code: "CreateEntry",
                        data: { entryId: D, name: "Entry D", type: entryType, friendlyId: "d", description: "" },
                    },
                    // B is a A
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: B,
                            valueExpression: `entry("${A}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // C is a A
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: C,
                            valueExpression: `entry("${A}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a B
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: D,
                            valueExpression: `entry("${B}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // D is a C
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: D,
                            valueExpression: `entry("${C}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                    // A is a D
                    {
                        code: "AddPropertyFact",
                        data: {
                            entryId: A,
                            valueExpression: `entry("${D}")`,
                            propertyId: entryIsA,
                            propertyFactId: VNID(),
                        },
                    },
                ],
                editSource: UseSystemSource,
            }));

            // Check the descendant of D
            await checkDescendants(D, [
                // A at a distance of 1, B and C at a distance of 2
                MakeAnnotatedEntryValue(A, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(2n) }),
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(2n) }),
            ]);

            // Check the descendants of A
            await checkDescendants(A, [
                // B and C at a distance of 1, D at a distance of 2
                MakeAnnotatedEntryValue(B, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(C, { distance: new IntegerValue(1n) }),
                MakeAnnotatedEntryValue(D, { distance: new IntegerValue(2n) }),
            ]);
        });
    });
});
