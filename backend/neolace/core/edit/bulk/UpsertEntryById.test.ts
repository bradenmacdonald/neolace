import { assertEquals, assertInstanceOf, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("UpsertEntryById bulk edit implementation", () => {
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
        assertNotExists,
        doBulkEdits,
        getAppliedEdits,
        populateOtherSite,
    } = testHelpers(defaultData);

    test("UpsertEntryById can upsert entries and conditionally overwrite their names, descriptions, and key", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const elephantPine = { id: VNID() };
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);
        await assertExists(jackPine);
        assertEquals(await getName(jackPine), jackPine.name); // Make sure it starts with the default name
        await assertNotExists(elephantPine);

        // Make the edit:
        await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: ponderosaPine.id },
                    setOnCreate: { key: "this-shouldnt-be-used" },
                    set: { name: "NEW Ponderosa", description: "NEW ponderosa description" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: jackPine.id },
                    setOnCreate: {
                        key: "this-shouldnt-be-used",
                        name: "nor this",
                        description: "nor this",
                    },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: elephantPine.id },
                    setOnCreate: { key: "s-elephant-pine" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getDescription(ponderosaPine), "NEW ponderosa description");
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key); // Unchanged since we used setOnCreate for key
        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getKey(jackPine), jackPine.key); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.
        await assertExists(elephantPine);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getDescription(elephantPine), "");
        assertEquals(await getKey(elephantPine), "s-elephant-pine");
    });

    test("UpsertEntryById creates AppliedEdit records as if actual edits were made, including with old values", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const elephantPine = { id: VNID() };
        // Preconditions:
        await assertExists(ponderosaPine);
        await assertExists(jackPine);
        await assertNotExists(elephantPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: ponderosaPine.id },
                    setOnCreate: { description: "This won't be used since ponderosa already exists." },
                    set: { name: "NEW Ponderosa", key: "s-new-ponderosa" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: jackPine.id },
                    setOnCreate: {
                        key: "this-shouldnt-be-used",
                        name: "nor this",
                        description: "nor this",
                    },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: elephantPine.id },
                    setOnCreate: { key: "s-elephant-pine" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getKey(ponderosaPine), "s-new-ponderosa");
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);

        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getKey(jackPine), jackPine.key); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.

        await assertExists(elephantPine);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getKey(elephantPine), "s-elephant-pine");
        assertEquals(await getDescription(elephantPine), "");

        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            {
                code: "SetEntryName",
                data: { entryId: ponderosaPine.id, name: "NEW Ponderosa" },
                oldData: { name: ponderosaPine.name },
            },
            {
                code: "SetEntryKey",
                data: { entryId: ponderosaPine.id, key: "s-new-ponderosa" },
                oldData: { key: ponderosaPine.key },
            },
            {
                code: "CreateEntry",
                data: {
                    entryId: elephantPine.id,
                    entryTypeKey: species.key,
                    description: "",
                    key: "s-elephant-pine",
                    name: "NEW Elephant Pine",
                },
                oldData: {}, // There is no "old data" for a newly created entry
            },
        ]);
    });

    test("UpsertEntryById has no effect at all if the upsert values are the same", async () => {
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getKey(ponderosaPine), ponderosaPine.key);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: species.key, entryId: ponderosaPine.id },
                    set: {
                        key: ponderosaPine.key,
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

    test("UpsertEntryById gives an error if the entry type is invalid", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryById",
                        data: {
                            where: { entryTypeKey: "nonexistent-entry-type", entryId: VNID() },
                            set: {
                                key: "s-foo",
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

    test("UpsertEntryById cannot upsert an entry whose ID is used on another site", async () => {
        const { entryA } = await populateOtherSite();
        // Now on the main site, try to upsert an entry with a conflicting ID:
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryById",
                        data: {
                            where: { entryTypeKey: species.key, entryId: entryA },
                            set: {
                                key: "s-foo",
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
        assertEquals(err.cause.message, "ID Conflict in upsert. Is another site using that entryId?");
    });
});
