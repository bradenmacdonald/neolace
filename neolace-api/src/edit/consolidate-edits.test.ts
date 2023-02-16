import { assertEquals } from "https://deno.land/std@0.170.0/testing/asserts.ts";
import { VNID } from "../types.ts";
import { AddPropertyFact, DeletePropertyFact, UpdatePropertyFact } from "./ContentEdit.ts";
import {
    type AnyEdit,
    consolidateEdits,
    CreateEntry,
    SetEntryDescription,
    SetEntryKey,
    SetEntryName,
} from "./index.ts";

const entryA = VNID("_entryA");
const entryB = VNID("_entryB");
const entryC = VNID("_entryC");
const type1 = "type-1";
const type2 = "type-2";
const type3 = "type-3";

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
            { code: SetEntryKey.code, data: { entryId: entryA, key: "A1" } },
            { code: SetEntryKey.code, data: { entryId: entryB, key: "B1" } },
            { code: SetEntryKey.code, data: { entryId: entryA, key: "A2" } },
            { code: SetEntryKey.code, data: { entryId: entryB, key: "B2" } },
            { code: SetEntryKey.code, data: { entryId: entryB, key: "B3" } },
            { code: SetEntryKey.code, data: { entryId: entryC, key: "C1" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            { code: SetEntryKey.code, data: { entryId: entryA, key: "A2" } },
            { code: SetEntryKey.code, data: { entryId: entryB, key: "B3" } },
            { code: SetEntryKey.code, data: { entryId: entryC, key: "C1" } },
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
                data: { entryId: entryA, name: "A name", key: "A", entryTypeKey: type1, description: "Entry A" },
            },
            {
                code: CreateEntry.code,
                data: { entryId: entryB, name: "B name", key: "B", entryTypeKey: type1, description: "Entry B" },
            },
            { code: SetEntryDescription.code, data: { entryId: entryA, description: "New A description" } },
            { code: SetEntryKey.code, data: { entryId: entryA, key: "A-new" } },
            { code: SetEntryName.code, data: { entryId: entryA, name: "A name new" } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: {
                    entryId: entryA,
                    name: "A name new",
                    key: "A-new",
                    entryTypeKey: type1,
                    description: "New A description",
                },
            },
            {
                code: CreateEntry.code,
                data: { entryId: entryB, name: "B name", key: "B", entryTypeKey: type1, description: "Entry B" },
            },
        ]);
    });

    await t.step("Two Create Entries", () => {
        // In our frontend, we use repeated CreateEntry to set the entry type in the editor when creating a new entry
        const oldEdits: AnyEdit[] = [
            {
                code: CreateEntry.code,
                data: { entryId: entryA, name: "A name", key: "A", entryTypeKey: type1, description: "Entry A" },
            },
            {
                code: CreateEntry.code,
                data: { entryId: entryA, name: "A name 2", key: "A2", entryTypeKey: type2, description: "Entry A2" },
            },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: { entryId: entryA, name: "A name 2", key: "A2", entryTypeKey: type2, description: "Entry A2" },
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
            { code: SetEntryKey.code, data: { entryId: entryA, key: "A" } },
            {
                code: CreateEntry.code,
                data: { entryId: entryA, name: "A name", key: "A", entryTypeKey: type1, description: "Entry A" },
            },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            {
                code: CreateEntry.code,
                data: { entryId: entryA, name: "A name", key: "A", entryTypeKey: type1, description: "Entry A" },
            },
        ]);
    });

    await t.step("Adding/updating/removing property facts", () => {
        // Create a couple of edits that won't be changed by what we're doing here.
        const unrelatedEdit1: AnyEdit = { code: SetEntryName.code, data: { entryId: entryC, name: "C name" } };
        const unrelatedEdit2: AnyEdit = {
            code: UpdatePropertyFact.code,
            data: { entryId: entryA, propertyFactId: VNID(), note: "new note" },
        };
        const propId = VNID();
        const fact1 = VNID(), fact2 = VNID();
        const oldEdits: AnyEdit[] = [
            // This new property value will get updated and then erased, so should consolidate to nothing:
            {
                code: AddPropertyFact.code,
                data: { entryId: entryA, propertyFactId: fact1, propertyKey: propId, valueExpression: "1 first value" },
            },
            unrelatedEdit1,
            // These two updates to 'fact2' should get consolidated:
            {
                code: UpdatePropertyFact.code,
                data: { entryId: entryA, propertyFactId: fact2, valueExpression: "2 first value" },
            },
            {
                code: UpdatePropertyFact.code,
                data: { entryId: entryA, propertyFactId: fact2, valueExpression: "2 second value" },
            },
            unrelatedEdit2,
            {
                code: UpdatePropertyFact.code,
                data: { entryId: entryA, propertyFactId: fact1, valueExpression: "1 second value" },
            },
            { code: DeletePropertyFact.code, data: { entryId: entryA, propertyFactId: fact1 } },
        ];
        assertEquals(consolidateEdits(oldEdits), [
            // The 'Add' has been removed since it was later deleted.
            unrelatedEdit1,
            // The two updates to 'fact2' should be consolidated:
            {
                code: UpdatePropertyFact.code,
                data: { entryId: entryA, propertyFactId: fact2, valueExpression: "2 second value" },
            },
            unrelatedEdit2,
            // The 'update' and 'delete' are gone, since they consolidate with the 'Add' to nothing.
        ]);
    });

    await t.step("Changing description after create and set property", () => {
        // This test case is based on a bug that we observed, where a property would disappear after changing the description.
        const firstEdit: AnyEdit = {
            code: "CreateEntry",
            data: {
                entryId: entryA,
                entryTypeKey: type1,
                name: "Aerial lift",
                description: "A **aerial lift** has yet to be described",
                key: "tc-trnsprt-cable-top",
            },
        };
        const secondEdit: AnyEdit = {
            code: "AddPropertyFact",
            data: {
                entryId: entryA,
                propertyKey: "some-prop",
                propertyFactId: VNID(),
                valueExpression: 'entry("_5tEE5QD4ucSGpKcwioQv0x")',
            },
        };
        const thirdEdit: AnyEdit = {
            code: "SetEntryDescription",
            data: {
                "entryId": entryA,
                "description": "A **aerial lift** is something like a gondola that hangs from a wire rope.",
            },
        };
        assertEquals(consolidateEdits([firstEdit, secondEdit, thirdEdit]), [
            { code: "CreateEntry", data: { ...firstEdit.data, description: thirdEdit.data.description } },
            secondEdit,
        ]);
    });

    await t.step("Changing entry type name after creating it", () => {
        assertEquals(
            consolidateEdits([
                { code: "CreateEntryType", data: { key: type1, name: "Old name 1" } },
                { code: "CreateEntryType", data: { key: type2, name: "Old name 2" } },
                { code: "CreateEntryType", data: { key: type3, name: "Type 3" } },
                { code: "UpdateEntryType", data: { key: type1, name: "New Name 1" } },
                { code: "UpdateEntryType", data: { key: type2, name: "New Name 2", description: "description 2" } },
                { code: "UpdateEntryType", data: { key: type3, description: "description 3. Name wasn't changed." } },
            ]),
            [
                { code: "CreateEntryType", data: { key: type1, name: "New Name 1" } },
                { code: "CreateEntryType", data: { key: type2, name: "New Name 2" } },
                { code: "UpdateEntryType", data: { key: type2, description: "description 2" } }, // Note that this moved up. Shouldn't be a problem? Would be better if it stayed put though.
                { code: "CreateEntryType", data: { key: type3, name: "Type 3" } },
                { code: "UpdateEntryType", data: { key: type3, description: "description 3. Name wasn't changed." } },
            ],
        );
    });

    await t.step("Changing entry article text", () => {
        assertEquals(
            consolidateEdits([
                { code: "UpdateEntryFeature", data: { entryId: entryA, feature: { featureType: "Article", articleContent: "first" } } },
                { code: "UpdateEntryFeature", data: { entryId: entryB, feature: { featureType: "Article", articleContent: "other" } } },
                { code: "UpdateEntryFeature", data: { entryId: entryA, feature: { featureType: "Article", articleContent: "second" } } },
            ]),
            [
                { code: "UpdateEntryFeature", data: { entryId: entryA, feature: { featureType: "Article", articleContent: "second" } } },
                { code: "UpdateEntryFeature", data: { entryId: entryB, feature: { featureType: "Article", articleContent: "other" } } },
            ],
        );
    });
});
