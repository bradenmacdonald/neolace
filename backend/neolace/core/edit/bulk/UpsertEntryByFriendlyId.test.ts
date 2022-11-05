import { assertEquals, assertInstanceOf, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("UpsertEntryByFriendlyId bulk edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const {
        // siteId,
        species,
        ponderosaPine,
        jackPine,
        // stonePine,
        getFriendlyId,
        getName,
        getDescription,
        assertExists,
        doBulkEdits,
        getAppliedEdits,
    } = testHelpers(defaultData);

    test("UpsertEntryByFriendlyId can upsert entries and conditionally overwrite their names and descriptions", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const newElephantPineFriendlyId = "s-elephant-pine";
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);
        await assertExists(jackPine);
        assertEquals(await getName(jackPine), jackPine.name); // Make sure it starts with the default name

        // Make the edit:
        await doBulkEdits([
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: ponderosaPine.friendlyId },
                    setOnCreate: { description: "This description should be ignored." },
                    set: { name: "NEW Ponderosa Name" },
                },
            },
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: jackPine.friendlyId },
                    setOnCreate: {
                        name: "should be ignored",
                        description: "this is ignored too",
                    },
                },
            },
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: newElephantPineFriendlyId },
                    setOnCreate: { description: "elephant pine description" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId); // Unchanged; this edit never changes the friendlyId.
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa Name");
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getFriendlyId(jackPine), jackPine.friendlyId); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.
        const elephantPine = await assertExists({ friendlyId: newElephantPineFriendlyId });
        assertEquals(await getFriendlyId(elephantPine), newElephantPineFriendlyId);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getDescription(elephantPine), "elephant pine description");
    });

    test("UpsertEntryByFriendlyId creates AppliedEdit records as if actual edits were made, including with old values", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const newElephantPineFriendlyId = "s-elephant-pine";
        // Preconditions:
        await assertExists(ponderosaPine);
        await assertExists(jackPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: ponderosaPine.friendlyId },
                    setOnCreate: { description: "This won't be used since ponderosa already exists." },
                    set: { name: "NEW Ponderosa" },
                },
            },
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: jackPine.friendlyId },
                    setOnCreate: {
                        name: "should be ignored",
                        description: "this is ignored too",
                    },
                },
            },
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: newElephantPineFriendlyId },
                    setOnCreate: {},
                    set: { name: "NEW Elephant Pine", description: "elephant pine description" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);

        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getFriendlyId(jackPine), jackPine.friendlyId); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.

        const elephantPine = await assertExists({ friendlyId: newElephantPineFriendlyId });
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getFriendlyId(elephantPine), "s-elephant-pine");
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
                    friendlyId: newElephantPineFriendlyId,
                    type: species.id,
                    description: "elephant pine description",
                    name: "NEW Elephant Pine",
                },
                oldData: {}, // There is no "old data" for a newly created entry
            },
        ]);
    });

    test("UpsertEntryByFriendlyId has no effect at all if the upsert values are the same", async () => {
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: ponderosaPine.friendlyId },
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
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);
        assertEquals(result.appliedEditIds, []);
    });

    test("UpsertEntryByFriendlyId gives an error if the entry type is invalid", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryByFriendlyId",
                        data: {
                            where: { entryTypeId: VNID(), friendlyId: "s-foo" },
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
            "Unable to bulk upsert entries. Check if entryTypeId or connectionId is invalid.",
        );
    });
});
