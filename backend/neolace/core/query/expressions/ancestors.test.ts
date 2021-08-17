import { group, test, setTestIsolation, assertEquals, assert } from "neolace/lib/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { Ancestors, AndAncestors } from "./ancestors.ts";
import { AnnotatedEntryValue, IntegerValue, PageValue } from "../values.ts";
import { This } from "./this.ts";
import { Count } from "./count.ts";

group(import.meta, () => {

    // These tests are read-only so don't need isolation, but do use the default plantDB example data:
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
    const siteId = defaultData.site.id;
    const ponderosaPine = defaultData.entries.ponderosaPine;

    group("ancestors()", () => {

        test("It can give all the ancestors of the ponderosa pine", async () => {

            const expression = new Ancestors(new This());

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id}).then(v => v.makeConcrete())
            );

            assertEquals(
                value,
                new PageValue(
                    [
                        new AnnotatedEntryValue(defaultData.entries.genusPinus.id,           {distance: new IntegerValue(1)}),
                        new AnnotatedEntryValue(defaultData.entries.familyPinaceae.id,       {distance: new IntegerValue(2)}),
                        new AnnotatedEntryValue(defaultData.entries.orderPinales.id,         {distance: new IntegerValue(3)}),
                        new AnnotatedEntryValue(defaultData.entries.classPinopsida.id,       {distance: new IntegerValue(4)}),
                        new AnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {distance: new IntegerValue(5)}),
                    ],
                    {
                        pageSize: 100n,
                        startedAt: 0n,
                        totalCount: 5n
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {

            const expression = new Count(new Ancestors(new This()));

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id})
            );

            assertEquals(value, new IntegerValue(5));
        });

    });

    group("andAncestors()", () => {

        test("It can give all the ancestors of the ponderosa pine", async () => {

            const expression = new AndAncestors(new This());
            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id}).then(v => v.makeConcrete())
            );

            assertEquals(
                value,
                new PageValue(
                    [
                        new AnnotatedEntryValue(defaultData.entries.ponderosaPine.id,        {distance: new IntegerValue(0)}),
                        new AnnotatedEntryValue(defaultData.entries.genusPinus.id,           {distance: new IntegerValue(1)}),
                        new AnnotatedEntryValue(defaultData.entries.familyPinaceae.id,       {distance: new IntegerValue(2)}),
                        new AnnotatedEntryValue(defaultData.entries.orderPinales.id,         {distance: new IntegerValue(3)}),
                        new AnnotatedEntryValue(defaultData.entries.classPinopsida.id,       {distance: new IntegerValue(4)}),
                        new AnnotatedEntryValue(defaultData.entries.divisionTracheophyta.id, {distance: new IntegerValue(5)}),
                    ],
                    {
                        pageSize: 100n,
                        startedAt: 0n,
                        totalCount: 6n
                    },
                ),
            );
        });

        test("It is compatible with count()", async () => {

            const expression = new Count(new AndAncestors(new This()));

            const value = await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id})
            );

            assertEquals(value, new IntegerValue(6));
        });

        const maxTime = 40;
        test(`It executes in < ${maxTime}ms`, async () => {
            const expression = new AndAncestors(new This());

            const start = performance.now();
            await graph.read(tx => 
                expression.getValue({tx, siteId, entryId: ponderosaPine.id}).then(v => v.makeConcrete())
            );
            const end = performance.now();
            assert(end - start < maxTime, `Expected andAncestors() to take under ${maxTime}ms but it took ${end - start}ms.`);
        });

    });
});
