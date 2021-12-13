import { VNID } from "neolace/deps/vertex-framework.ts";
import { PropertyType } from "neolace/deps/neolace-api.ts";
import { group, test, setTestIsolation, assertEquals } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { CreateSite } from "neolace/core/Site.ts";
import { ApplyEdits } from "neolace/core/edit/ApplyEdits.ts";
import { Ancestors, AndAncestors } from "./ancestors.ts";
import { MakeAnnotatedEntryValue, IntegerValue, PageValue, AnnotatedValue } from "../values.ts";
import { This } from "./this.ts";
import { Count } from "./count.ts";
import { LookupExpression } from "../expression.ts";


group(import.meta, () => {

    group("ancestors()", () => {

        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It can give all the ancestors of the ponderosa pine", async () => {

            const expression = new Ancestors(new This());

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n}).then(v => v.makeConcrete())
            );

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id,           {distance: new IntegerValue(1)}),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id,       {distance: new IntegerValue(2)}),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id,         {distance: new IntegerValue(3)}),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id,       {distance: new IntegerValue(4)}),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {distance: new IntegerValue(5)}),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 5n
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {

            const expression = new Count(new Ancestors(new This()));

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n})
            );

            assertEquals(value, new IntegerValue(5));
        });

    });

    group("andAncestors()", () => {

        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const siteId = defaultData.site.id;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("It can give all the ancestors of the ponderosa pine", async () => {

            const expression = new AndAncestors(new This());
            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n}).then(v => v.makeConcrete())
            );

            assertEquals(
                value,
                new PageValue(
                    [
                        MakeAnnotatedEntryValue(defaultData.entries.ponderosaPine.id,        {distance: new IntegerValue(0)}),
                        MakeAnnotatedEntryValue(defaultData.entries.genusPinus.id,           {distance: new IntegerValue(1)}),
                        MakeAnnotatedEntryValue(defaultData.entries.familyPinaceae.id,       {distance: new IntegerValue(2)}),
                        MakeAnnotatedEntryValue(defaultData.entries.orderPinales.id,         {distance: new IntegerValue(3)}),
                        MakeAnnotatedEntryValue(defaultData.entries.classPinopsida.id,       {distance: new IntegerValue(4)}),
                        MakeAnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {distance: new IntegerValue(5)}),
                    ],
                    {
                        pageSize: 10n,
                        startedAt: 0n,
                        totalCount: 6n
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {

            const expression = new Count(new AndAncestors(new This()));

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n})
            );

            assertEquals(value, new IntegerValue(6));
        });

        /* Not reliable on the low-powered GitHub Actions CI runners
        const maxTime = 40;
        test(`It executes in < ${maxTime}ms`, async () => {
            const expression = new AndAncestors(new This());

            const start = performance.now();
            await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id, defaultPageSize: 10n}).then(v => v.makeConcrete())
            );
            const end = performance.now();
            assert(end - start < maxTime, `Expected andAncestors() to take under ${maxTime}ms but it took ${end - start}ms.`);
        });
        */

    });

    group("ancestors()/andAncestors() - additional tests", () => {
        setTestIsolation(setTestIsolation.levels.BLANK_ISOLATED);

        const siteId = VNID();
        const entryType = VNID(), entryIsA = VNID();
        const A = VNID(), B = VNID(), C = VNID(), D = VNID(), E = VNID(), F = VNID(), G = VNID(), H = VNID(), I = VNID();

        const evalExpr = async (expr: LookupExpression, entryId: VNID) => await graph.read(tx => 
            expr.getValue({tx, siteId, entryId, defaultPageSize: 10n}).then(v => v.makeConcrete())
        );

        const checkAncestors = async (entryId: VNID, expected: AnnotatedValue[]) => {
            // with ancestors():
            assertEquals(await evalExpr( new Ancestors(new This()), entryId), new PageValue([
                ...expected,
            ], {pageSize: 10n, startedAt: 0n, totalCount: BigInt(expected.length)}));

            // And with andAncestors():
            assertEquals(await evalExpr( new AndAncestors(new This()), entryId), new PageValue([
                MakeAnnotatedEntryValue(entryId, {distance: new IntegerValue(0n)}),
                ...expected,
            ], {pageSize: 10n, startedAt: 0n, totalCount: BigInt(expected.length + 1)}));
        };

        test("Returns only the shortest distance to duplicate ancestors", async () => {
            // Create this entry tree:
            //     A    B
            //    / \  /  \
            //   C   D     E
            //    \ /     /|
            //     F    /  |  G
            //      \ /    | /
            //       H     I

            await graph.runAsSystem(CreateSite({id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateProperty", data: {id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{entryType}]}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                {code: "CreateEntry", data: {id: D, name: "Entry D", type: entryType, friendlyId: "d", description: ""}},
                {code: "CreateEntry", data: {id: E, name: "Entry E", type: entryType, friendlyId: "e", description: ""}},
                {code: "CreateEntry", data: {id: F, name: "Entry F", type: entryType, friendlyId: "f", description: ""}},
                {code: "CreateEntry", data: {id: G, name: "Entry G", type: entryType, friendlyId: "g", description: ""}},
                {code: "CreateEntry", data: {id: H, name: "Entry H", type: entryType, friendlyId: "h", description: ""}},
                {code: "CreateEntry", data: {id: I, name: "Entry I", type: entryType, friendlyId: "i", description: ""}},
                // C is a A
                {code: "AddPropertyValue", data: {entry: C, valueExpression: `[[/entry/${A}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // D is a A
                {code: "AddPropertyValue", data: {entry: D, valueExpression: `[[/entry/${A}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // D is a B
                {code: "AddPropertyValue", data: {entry: D, valueExpression: `[[/entry/${B}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // E is a B
                {code: "AddPropertyValue", data: {entry: E, valueExpression: `[[/entry/${B}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // F is a C
                {code: "AddPropertyValue", data: {entry: F, valueExpression: `[[/entry/${C}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // F is a D
                {code: "AddPropertyValue", data: {entry: F, valueExpression: `[[/entry/${D}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // H is a F
                {code: "AddPropertyValue", data: {entry: H, valueExpression: `[[/entry/${F}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // H is a E
                {code: "AddPropertyValue", data: {entry: H, valueExpression: `[[/entry/${E}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // I is a E
                {code: "AddPropertyValue", data: {entry: I, valueExpression: `[[/entry/${E}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // I is a G
                {code: "AddPropertyValue", data: {entry: I, valueExpression: `[[/entry/${G}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
            ]}));

            // Check the ancestor of C
            await checkAncestors(C, [
                // Expect one ancestor, A:
                MakeAnnotatedEntryValue(A, {distance: new IntegerValue(1n)}),
            ]);

            // Check the ancestor of I
            await checkAncestors(I, [
                // Expect 2 immediate ancestors (E & G), plus one ancestor B at distance of 2.
                MakeAnnotatedEntryValue(E, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(G, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(B, {distance: new IntegerValue(2n)}),
            ]);

            // Check the ancestor of H
            await checkAncestors(H, [
                // We should find that H has 6 ancestors, and the distance from H to B is 2, from H to A is 3, and from H to E is 1
                MakeAnnotatedEntryValue(E, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(F, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(B, {distance: new IntegerValue(2n)}),
                MakeAnnotatedEntryValue(C, {distance: new IntegerValue(2n)}),
                MakeAnnotatedEntryValue(D, {distance: new IntegerValue(2n)}),
                MakeAnnotatedEntryValue(A, {distance: new IntegerValue(3n)}),
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

            await graph.runAsSystem(CreateSite({id: siteId, name: "Test Site", domain: "test-site.neolace.net", slugId: "site-test"}));
            await graph.runAsSystem(ApplyEdits({siteId, edits: [
                {code: "CreateEntryType", data: {id: entryType, name: "EntryType"}},
                {code: "CreateProperty", data: {id: entryIsA, type: PropertyType.RelIsA, name: "is a", appliesTo: [{entryType}]}},
                {code: "CreateEntry", data: {id: A, name: "Entry A", type: entryType, friendlyId: "a", description: ""}},
                {code: "CreateEntry", data: {id: B, name: "Entry B", type: entryType, friendlyId: "b", description: ""}},
                {code: "CreateEntry", data: {id: C, name: "Entry C", type: entryType, friendlyId: "c", description: ""}},
                {code: "CreateEntry", data: {id: D, name: "Entry D", type: entryType, friendlyId: "d", description: ""}},
                // B is a A
                {code: "AddPropertyValue", data: {entry: B, valueExpression: `[[/entry/${A}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // C is a A
                {code: "AddPropertyValue", data: {entry: C, valueExpression: `[[/entry/${A}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // D is a B
                {code: "AddPropertyValue", data: {entry: D, valueExpression: `[[/entry/${B}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // D is a C
                {code: "AddPropertyValue", data: {entry: D, valueExpression: `[[/entry/${C}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
                // A is a D
                {code: "AddPropertyValue", data: {entry: A, valueExpression: `[[/entry/${D}]]`, property: entryIsA, propertyFactId: VNID(), note: ""}},
            ]}));

            // Check the ancestor of D
            await checkAncestors(D, [
                // B and C at a distance of 1, A at a distance of 2
                MakeAnnotatedEntryValue(B, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(C, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(A, {distance: new IntegerValue(2n)}),
            ]);

            // Check the ancestor of A
            await checkAncestors(A, [
                // D at a distance of 1, B and C at a distance of 2
                MakeAnnotatedEntryValue(D, {distance: new IntegerValue(1n)}),
                MakeAnnotatedEntryValue(B, {distance: new IntegerValue(2n)}),
                MakeAnnotatedEntryValue(C, {distance: new IntegerValue(2n)}),
            ]);
        });
    });
});
