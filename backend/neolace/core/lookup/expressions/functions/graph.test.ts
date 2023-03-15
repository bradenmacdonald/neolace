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
import { PropertyType } from "neolace/deps/neolace-sdk.ts";
import {
    assertArrayIncludes,
    assertEquals,
    assertInstanceOf,
    createManyEntries,
    createUserWithPermissions,
    group,
    setTestIsolation,
    test,
    TestLookupContext,
} from "neolace/lib/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { AndAncestors } from "./ancestors.ts";
import { GraphValue } from "../../values.ts";
import { This } from "../this.ts";
import { Graph } from "./graph.ts";
import { ApplyEdits, UseSystemSource } from "neolace/core/edit/ApplyEdits.ts";
import { Descendants } from "./descendants.ts";
import { AllEntries } from "neolace/core/lookup/expressions.ts";
import { AccessMode, UpdateSite } from "../../../Site.ts";
import { Always, EntryTypesCondition, PermissionGrant } from "neolace/core/permissions/grant.ts";
import { corePerm } from "neolace/core/permissions/permissions.ts";

group("graph()", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;
    const westernRedcedar = defaultData.entries.westernRedcedar;
    const context = new TestLookupContext({ siteId, entryId: ponderosaPine.id });

    const entryTypeKey = "test-entry-type", entryIsA = "prop-is-a";
    const A = VNID(),
        B = VNID(),
        C = VNID(),
        D = VNID();

    test("It can show an empty graph.", async () => {
        const value = await context.evaluateExprConcrete(`[].graph()`);
        assertEquals(value, new GraphValue([], [], []));
    });

    test("It can graph all the ancestors of the ponderosa pine", async () => {
        const value = await context.evaluateExprConcrete("this.andAncestors().graph()");

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries, [
            {
                entryId: defaultData.entries.ponderosaPine.id,
                entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                name: "Ponderosa Pine",
                isFocusEntry: true,
            },
            {
                entryId: defaultData.entries.genusPinus.id,
                entryTypeKey: defaultData.schema.entryTypes.ETGENUS.key,
                name: "Pinus",
            },
            {
                entryId: defaultData.entries.familyPinaceae.id,
                entryTypeKey: defaultData.schema.entryTypes.ETFAMILY.key,
                name: "Pinaceae",
            },
            {
                entryId: defaultData.entries.orderPinales.id,
                entryTypeKey: defaultData.schema.entryTypes.ETORDER.key,
                name: "Pinales",
            },
            {
                entryId: defaultData.entries.classPinopsida.id,
                entryTypeKey: defaultData.schema.entryTypes.ETCLASS.key,
                name: "Pinopsida",
            },
            {
                entryId: defaultData.entries.divisionTracheophyta.id,
                entryTypeKey: defaultData.schema.entryTypes.ETDIVISION.key,
                name: "Tracheophyta",
            },
        ]);
        const expectedRels = [
            {
                fromEntryId: defaultData.entries.classPinopsida.id,
                relTypeKey: defaultData.schema.properties.parentDivision.key,
                toEntryId: defaultData.entries.divisionTracheophyta.id,
            },
            {
                fromEntryId: defaultData.entries.orderPinales.id,
                relTypeKey: defaultData.schema.properties.parentClass.key,
                toEntryId: defaultData.entries.classPinopsida.id,
            },
            {
                fromEntryId: defaultData.entries.familyPinaceae.id,
                relTypeKey: defaultData.schema.properties.parentOrder.key,
                toEntryId: defaultData.entries.orderPinales.id,
            },
            {
                fromEntryId: defaultData.entries.genusPinus.id,
                relTypeKey: defaultData.schema.properties.parentFamily.key,
                toEntryId: defaultData.entries.familyPinaceae.id,
            },
            {
                fromEntryId: defaultData.entries.ponderosaPine.id,
                relTypeKey: defaultData.schema.properties.parentGenus.key,
                toEntryId: defaultData.entries.genusPinus.id,
            },
        ];
        assertEquals(value.rels.length, expectedRels.length);
        // Because the order of the relationships changes over time, we have to test this way:
        const actualRelsWithoutRelId = value.rels.map((r) => {
            const { relId: _unused, ...rest } = r;
            return rest;
        });
        assertArrayIncludes(actualRelsWithoutRelId, expectedRels);
    });

    test("It can show the relationships that connect to the selected nodes", async () => {
        const value = await context.evaluateExprConcrete(`[this, entry("${westernRedcedar.id}")].graph()`);

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries, [
            {
                entryId: ponderosaPine.id,
                entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                name: "Ponderosa Pine",
                isFocusEntry: true,
            },
            {
                entryId: westernRedcedar.id,
                entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
                name: "Western Redcedar",
            },
        ]);
        // There are no relationships between these two species entries.
        assertEquals(value.rels.length, 0);
        // But there are adjacent relationships:
        assertEquals(value.borderingRelationships.length, 4);
        assertArrayIncludes(value.borderingRelationships, [
            // Both species have "parent genus" relationships:
            {
                entryId: ponderosaPine.id,
                relTypeKey: defaultData.schema.properties.parentGenus.key,
                entryCount: 1, // Just the parent genus entry
                isOutbound: true,
            },
            {
                entryId: westernRedcedar.id,
                relTypeKey: defaultData.schema.properties.parentGenus.key,
                entryCount: 1, // Just the parent genus entry
                isOutbound: true,
            },
            // Ponderosa pine has a hero image:
            {
                entryId: ponderosaPine.id,
                relTypeKey: defaultData.schema.properties.hasHeroImage.key,
                entryCount: 1,
                isOutbound: true,
            },
            // And there is an image that "relates to" ponderosa pine.
            {
                entryId: ponderosaPine.id,
                relTypeKey: defaultData.schema.properties.imgRelTo.key,
                entryCount: 1,
                isOutbound: false,
            },
        ]);
    });

    test("It can show two isolated nodes.", async () => {
        // This tests makes sure that there are no bugs when returning nodes that don't have any relationships.
        // It's hard to get the "borderingRelationships" query right without this test.
        const graph = await getGraph();
        await graph.runAsSystem(ApplyEdits({
            siteId,
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
            ],
            editSource: UseSystemSource,
        }));
        const value = await context.evaluateExprConcrete(`[entry("${A}"), entry("${B}")].graph()`);
        assertEquals(
            value,
            new GraphValue(
                [
                    { entryId: A, entryTypeKey, name: "Entry A" },
                    { entryId: B, entryTypeKey, name: "Entry B" },
                ],
                [],
                [],
            ),
        );
    });

    test("It checks permissions on bordering entries.", async () => {
        // First make the PlantDB site private:
        const graph = await getGraph();
        await graph.runAsSystem(UpdateSite({
            id: defaultData.site.id,
            accessMode: AccessMode.Private,
        }));
        // Create a user who can view SPECIES entries but nothing else:
        const limitedUser = await createUserWithPermissions(
            // This user can view the site:
            new PermissionGrant(Always, [corePerm.viewSite.name]),
            // This user can view only "species" entries:
            new PermissionGrant(
                new EntryTypesCondition([defaultData.schema.entryTypes.ETSPECIES.key]),
                [corePerm.viewEntry.name],
            ),
        );

        const expr = `entry("${ponderosaPine.id}").graph()`;
        const limitedResult = await context.evaluateExprConcrete(expr, undefined, limitedUser.userId);
        assertInstanceOf(limitedResult, GraphValue);
        const adminResult = await context.evaluateExprConcrete(expr, undefined, defaultData.users.admin.id);
        assertInstanceOf(adminResult, GraphValue);
        // Both the limited user and the admin can see the species entry requested:
        assertEquals(limitedResult.entries, [{
            entryId: ponderosaPine.id,
            entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
            name: ponderosaPine.name,
            isFocusEntry: true,
        }]);
        assertEquals(adminResult.entries, limitedResult.entries);
        // But the limited user shouldn't see that there is a bordering genus entry, since they have no permission to view that entry:
        assertEquals(limitedResult.borderingRelationships, []);
        // The admin user can of course see all the relationships:
        assertEquals(adminResult.borderingRelationships.length, 3);
    });

    test("It can show the relationships that connect to the selected nodes and the entry count", async () => {
        const value = await context.evaluateExprConcrete(`entry("${defaultData.entries.genusPinus.id}").graph()`);

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries, [
            {
                entryId: defaultData.entries.genusPinus.id,
                entryTypeKey: defaultData.schema.entryTypes.ETGENUS.key,
                name: "Pinus",
            },
        ]);
        // There are no relationships among the selected entries (only one entry was graphed/selected)
        assertEquals(value.rels.length, 0);
        // But there are adjacent relationships:
        assertEquals(value.borderingRelationships.length, 2);
        assertArrayIncludes(value.borderingRelationships, [
            // The genus has a "parent family" relationship:
            {
                entryId: defaultData.entries.genusPinus.id,
                relTypeKey: defaultData.schema.properties.parentFamily.key,
                entryCount: 1, // Just the one parent family entry
                isOutbound: true,
            },
            // And many species have a "parent genus" relationship to this:
            {
                entryId: defaultData.entries.genusPinus.id,
                relTypeKey: defaultData.schema.properties.parentGenus.key,
                entryCount: 8,
                isOutbound: false, // Note this is a reverse relationship
            },
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

        await graph.runAsSystem(ApplyEdits({
            siteId,
            edits: [
                { code: "CreateEntryType", data: { key: entryTypeKey, name: "EntryType" } },
                {
                    code: "CreateProperty",
                    data: { key: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{ entryTypeKey }] },
                },
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
                {
                    code: "CreateEntry",
                    data: { entryId: D, name: "Entry D", entryTypeKey, key: "d", description: "" },
                },
                // B is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: B,
                        valueExpression: `entry("${A}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // C is a A
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: C,
                        valueExpression: `entry("${A}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a B
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${B}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // D is a C
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: D,
                        valueExpression: `entry("${C}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
                // A is a D
                {
                    code: "AddPropertyFact",
                    data: {
                        entryId: A,
                        valueExpression: `entry("${D}")`,
                        propertyKey: entryIsA,
                        propertyFactId: VNID(),
                    },
                },
            ],
            editSource: UseSystemSource,
        }));

        const expression = new Graph(new AndAncestors(new This()));
        // Get A and its ancestors:
        const value = await context.evaluateExprConcrete(expression, A);

        assertInstanceOf(value, GraphValue);
        assertEquals<typeof value.entries>(value.entries, [
            {
                entryId: A,
                entryTypeKey,
                name: "Entry A",
                isFocusEntry: true,
            },
            {
                entryId: D,
                entryTypeKey,
                name: "Entry D",
            },
            {
                entryId: B,
                entryTypeKey,
                name: "Entry B",
            },
            {
                entryId: C,
                entryTypeKey,
                name: "Entry C",
            },
        ]);

        // These are the expected relationships, without 'relId' since that will be different each time.
        const expectedRels = [
            {
                fromEntryId: A,
                relTypeKey: entryIsA,
                toEntryId: D,
            },
            {
                fromEntryId: B,
                relTypeKey: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: C,
                relTypeKey: entryIsA,
                toEntryId: A,
            },
            {
                fromEntryId: D,
                relTypeKey: entryIsA,
                toEntryId: C,
            },
            {
                fromEntryId: D,
                relTypeKey: entryIsA,
                toEntryId: B,
            },
        ];
        assertEquals(value.rels.length, expectedRels.length);
        // Because the order of the relationships changes over time, we have to test this way:
        const actualRelsWithoutRelId = value.rels.map((r) => {
            const { relId: _unused, ...rest } = r;
            return rest;
        });
        assertArrayIncludes(actualRelsWithoutRelId, expectedRels);
    });

    test("Works on empty values", async () => {
        // Ponderosa pine has no descendants so this will be an empty set of entries to graph:
        const expression = new Graph(new Descendants(new This()));
        const value = await context.evaluateExprConcrete(expression);

        assertEquals(value, new GraphValue([], [], []));
    });

    test("toString()", () => {
        assertEquals(new Graph(new This()).toString(), "this.graph()");
    });

    test("Limits the total number of nodes that can be returned.", async () => {
        // Create 6,000 entries:
        const numEntries = 6_000;
        const entryTypeKey = defaultData.schema.entryTypes.ETSPECIES.key;
        await createManyEntries(defaultData.site.id, entryTypeKey, numEntries);

        const expression = new Graph(new AllEntries());
        const value = await context.evaluateExprConcrete(expression);

        assertInstanceOf(value, GraphValue);
        assertEquals(value.entries.length, 5_000);
    });
});
