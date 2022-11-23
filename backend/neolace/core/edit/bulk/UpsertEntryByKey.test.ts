import { assertEquals, assertInstanceOf, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("UpsertEntryByKey bulk edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const {
        // siteId,
        species,
        ponderosaPine,
        jackPine,
        // stonePine,
        getKey,
        getName,
        getDescription,
        assertExists,
        doBulkEdits,
        getAppliedEdits,
    } = testHelpers(defaultData);

    test("UpsertEntryByKey can upsert entries and conditionally overwrite their names and descriptions", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const newElephantPineKey = "s-elephant-pine";
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);
        await assertExists(jackPine);
        assertEquals(await getName(jackPine), jackPine.name); // Make sure it starts with the default name

        // Make the edit:
        await doBulkEdits([
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: ponderosaPine.key },
                    setOnCreate: { description: "This description should be ignored." },
                    set: { name: "NEW Ponderosa Name" },
                },
            },
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: jackPine.key },
                    setOnCreate: {
                        name: "should be ignored",
                        description: "this is ignored too",
                    },
                },
            },
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: newElephantPineKey },
                    setOnCreate: { description: "elephant pine description" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key); // Unchanged; this edit never changes the key.
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa Name");
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(jackPine), jackPine.key); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.
        const elephantPine = await assertExists({ key: newElephantPineKey });
        assertEquals(await getKey(elephantPine), newElephantPineKey);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getDescription(elephantPine), "elephant pine description");
    });

    test("UpsertEntryByKey creates AppliedEdit records as if actual edits were made, including with old values", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const newElephantPineKey = "s-elephant-pine";
        // Preconditions:
        await assertExists(ponderosaPine);
        await assertExists(jackPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: ponderosaPine.key },
                    setOnCreate: { description: "This won't be used since ponderosa already exists." },
                    set: { name: "NEW Ponderosa" },
                },
            },
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: jackPine.key },
                    setOnCreate: {
                        name: "should be ignored",
                        description: "this is ignored too",
                    },
                },
            },
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: newElephantPineKey },
                    setOnCreate: {},
                    set: { name: "NEW Elephant Pine", description: "elephant pine description" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);

        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getKey(jackPine), jackPine.key); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.

        const elephantPine = await assertExists({ key: newElephantPineKey });
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getKey(elephantPine), "s-elephant-pine");
        assertEquals(await getDescription(elephantPine), "elephant pine description");

        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            {
                code: "SetEntryName",
                data: { entryId: ponderosaPine.id, name: "NEW Ponderosa" },
                oldData: { name: ponderosaPine.name },
            },
            {
                code: "CreateEntry",
                data: {
                    entryId: elephantPine.id,
                    key: newElephantPineKey,
                    entryTypeKey: species.key,
                    description: "elephant pine description",
                    name: "NEW Elephant Pine",
                },
                oldData: {}, // There is no "old data" for a newly created entry
            },
        ]);
    });

    test("UpsertEntryByKey has no effect at all if the upsert values are the same", async () => {
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: ponderosaPine.key },
                    set: {
                        name: ponderosaPine.name,
                        description: ponderosaPine.description,
                    },
                },
            },
        ]);

        // Now check that nothing happened:
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);
        assertEquals(result.appliedEditIds, []);
    });

    test("UpsertEntryByKey gives an error if the entry type is invalid", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryByKey",
                        data: {
                            where: { entryTypeKey: VNID(), entryKey: "s-foo" },
                            set: {
                                name: "Foo name",
                                description: "foo bar",
                            },
                        },
                    },
                ]),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            "Unable to bulk upsert entries. Check if entryTypeKey or connectionId is invalid.",
        );
    });
});
