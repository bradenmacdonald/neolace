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
        getFriendlyId,
        getName,
        getDescription,
        assertExists,
        assertNotExists,
        doBulkEdits,
        getAppliedEdits,
        populateOtherSite,
    } = testHelpers(defaultData);

    test("UpsertEntryById can upsert entries and conditionally overwrite their names, descriptions, and friendlyId", async () => {
        /** The "elephant pine" does not exist in the default data set. */
        const elephantPine = { id: VNID() };
        // Preconditions:
        await assertExists(ponderosaPine);
        assertEquals(await getName(ponderosaPine), ponderosaPine.name);
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);
        await assertExists(jackPine);
        assertEquals(await getName(jackPine), jackPine.name); // Make sure it starts with the default name
        await assertNotExists(elephantPine);

        // Make the edit:
        await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: ponderosaPine.id },
                    setOnCreate: { friendlyId: "this-shouldnt-be-used" },
                    set: { name: "NEW Ponderosa", description: "NEW ponderosa description" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: jackPine.id },
                    setOnCreate: {
                        friendlyId: "this-shouldnt-be-used",
                        name: "nor this",
                        description: "nor this",
                    },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: elephantPine.id },
                    setOnCreate: { friendlyId: "s-elephant-pine" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getDescription(ponderosaPine), "NEW ponderosa description");
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId); // Unchanged since we used setOnCreate for friendlyId
        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getFriendlyId(jackPine), jackPine.friendlyId); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.
        await assertExists(elephantPine);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getDescription(elephantPine), "");
        assertEquals(await getFriendlyId(elephantPine), "s-elephant-pine");
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
                    where: { entryTypeId: species.id, entryId: ponderosaPine.id },
                    setOnCreate: { description: "This won't be used since ponderosa already exists." },
                    set: { name: "NEW Ponderosa", friendlyId: "s-new-ponderosa" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: jackPine.id },
                    setOnCreate: {
                        friendlyId: "this-shouldnt-be-used",
                        name: "nor this",
                        description: "nor this",
                    },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: elephantPine.id },
                    setOnCreate: { friendlyId: "s-elephant-pine" },
                    set: { name: "NEW Elephant Pine" },
                },
            },
        ]);

        // Now check if it worked:
        assertEquals(await getName(ponderosaPine), "NEW Ponderosa");
        assertEquals(await getFriendlyId(ponderosaPine), "s-new-ponderosa");
        assertEquals(await getDescription(ponderosaPine), ponderosaPine.description);

        assertEquals(await getName(jackPine), jackPine.name); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getFriendlyId(jackPine), jackPine.friendlyId); // Unchanged since we used setOnCreate for all jackPine fields.
        assertEquals(await getDescription(jackPine), jackPine.description); // Unchanged since we used setOnCreate for all jackPine fields.

        await assertExists(elephantPine);
        assertEquals(await getName(elephantPine), "NEW Elephant Pine");
        assertEquals(await getFriendlyId(elephantPine), "s-elephant-pine");
        assertEquals(await getDescription(elephantPine), "");

        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            {
                code: "SetEntryName",
                data: { entryId: ponderosaPine.id, name: "NEW Ponderosa" },
                oldData: { name: ponderosaPine.name },
            },
            {
                code: "SetEntryFriendlyId",
                data: { entryId: ponderosaPine.id, friendlyId: "s-new-ponderosa" },
                oldData: { friendlyId: ponderosaPine.friendlyId },
            },
            {
                code: "CreateEntry",
                data: {
                    entryId: elephantPine.id,
                    type: species.id,
                    description: "",
                    friendlyId: "s-elephant-pine",
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
        assertEquals(await getFriendlyId(ponderosaPine), ponderosaPine.friendlyId);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeId: species.id, entryId: ponderosaPine.id },
                    set: {
                        friendlyId: ponderosaPine.friendlyId,
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

    test("UpsertEntryById gives an error if the entry type is invalid", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryById",
                        data: {
                            where: { entryTypeId: VNID(), entryId: VNID() },
                            set: {
                                friendlyId: "s-foo",
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

    test("UpsertEntryById cannot upsert an entry whose ID is used on another site", async () => {
        const { entryA } = await populateOtherSite();
        // Now on the main site, try to upsert an entry with a conflicting ID:
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "UpsertEntryById",
                        data: {
                            where: { entryTypeId: species.id, entryId: entryA },
                            set: {
                                friendlyId: "s-foo",
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
