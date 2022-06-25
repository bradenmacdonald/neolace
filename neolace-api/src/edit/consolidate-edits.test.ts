import { assertEquals } from "https://deno.land/std@0.145.0/testing/asserts.ts";
import { VNID } from "../types.ts";
import {
    type AnyEdit,
    consolidateEdits,
    CreateEntry,
    SetEntryDescription,
    SetEntryFriendlyId,
    SetEntryName,
} from "./index.ts";

const entryA = VNID("_entryA");
const entryB = VNID("_entryB");
const entryC = VNID("_entryC");
const type1 = VNID("_type1");
const type2 = VNID("_type2");

Deno.test("Consolidate edits", async (t) => {
    await t.step("two renames of the same entry", () => {
        const oldEdits: AnyEdit[] = [
            { code: SetEntryName.code, data: { entryId: entryA, name: "name 1" } },
            { code: SetEntryName.code, data: { entryId: entryA, name: "name 2" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            { code: SetEntryName.code, data: { entryId: entryA, name: "name 2" } },
        ]);
    });

    await t.step("renames of different entries", () => {
        const oldEdits: AnyEdit[] = [
            { code: SetEntryName.code, data: { entryId: entryA, name: "name A1" } },
            { code: SetEntryName.code, data: { entryId: entryB, name: "name B1" } },
            { code: SetEntryName.code, data: { entryId: entryA, name: "name A2" } },
            { code: SetEntryName.code, data: { entryId: entryB, name: "name B2" } },
            { code: SetEntryName.code, data: { entryId: entryB, name: "name B3" } },
            { code: SetEntryName.code, data: { entryId: entryC, name: "name C1" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            { code: SetEntryName.code, data: { entryId: entryA, name: "name A2" } },
            { code: SetEntryName.code, data: { entryId: entryB, name: "name B3" } },
            { code: SetEntryName.code, data: { entryId: entryC, name: "name C1" } },
        ]);
    });

    await t.step("changing entry IDs", () => {
        const oldEdits: AnyEdit[] = [
            { code: SetEntryFriendlyId.code, data: { entryId: entryA, friendlyId: "A1" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryB, friendlyId: "B1" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryA, friendlyId: "A2" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryB, friendlyId: "B2" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryB, friendlyId: "B3" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryC, friendlyId: "C1" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            { code: SetEntryFriendlyId.code, data: { entryId: entryA, friendlyId: "A2" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryB, friendlyId: "B3" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryC, friendlyId: "C1" } },
        ]);
    });

    await t.step("changing entry descriptions", () => {
        const oldEdits: AnyEdit[] = [
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "A1" } },
            { code: SetEntryDescription.code, data: { entryId: entryB, description: "B1" } },
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "A2" } },
            { code: SetEntryDescription.code, data: { entryId: entryB, description: "B2" } },
            { code: SetEntryDescription.code, data: { entryId: entryB, description: "B3" } },
            { code: SetEntryDescription.code, data: { entryId: entryC, description: "C1" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "A2" } },
            { code: SetEntryDescription.code, data: { entryId: entryB, description: "B3" } },
            { code: SetEntryDescription.code, data: { entryId: entryC, description: "C1" } },
        ]);
    });

    await t.step("Create entry followed by changes", () => {
        const oldEdits: AnyEdit[] = [
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name", friendlyId: "A", type: type1, description: "Entry A" },
            },
            {
                code: CreateEntry.code,
                data: { id: entryB, name: "B name", friendlyId: "B", type: type1, description: "Entry B" },
            },
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "New A description" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryA, friendlyId: "A-new" } },
            { code: SetEntryName.code, data: { entryId: entryA, name: "A name new" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: {
                    id: entryA,
                    name: "A name new",
                    friendlyId: "A-new",
                    type: type1,
                    description: "New A description",
                },
            },
            {
                code: CreateEntry.code,
                data: { id: entryB, name: "B name", friendlyId: "B", type: type1, description: "Entry B" },
            },
        ]);
    });

    await t.step("Two Create Entries", () => {
        // In our frontend, we use repeated CreateEntry to set the entry type in the editor when creating a new entry
        const oldEdits: AnyEdit[] = [
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name", friendlyId: "A", type: type1, description: "Entry A" },
            },
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name 2", friendlyId: "A2", type: type2, description: "Entry A2" },
            },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name 2", friendlyId: "A2", type: type2, description: "Entry A2" },
            },
        ]);
    });

    await t.step("Set name/desc/id before create", () => {
        // In our frontend, we allow users to set the name and ID before setting the type
        // (only setting the type makes Create Entry)
        const oldEdits: AnyEdit[] = [
            { code: SetEntryName.code, data: { entryId: entryA, name: "A old name, to be changed" } },
            { code: SetEntryName.code, data: { entryId: entryA, name: "A name" } },
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "A desc" } },
            { code: SetEntryFriendlyId.code, data: { entryId: entryA, friendlyId: "A" } },
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name", friendlyId: "A", type: type1, description: "Entry A" },
            },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: { id: entryA, name: "A name", friendlyId: "A", type: type1, description: "Entry A" },
            },
        ]);
    });
});
