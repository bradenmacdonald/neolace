import {
    assert,
    assertEquals,
    assertFalse,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

/** Helper function to apply edits for this test case, using an API client. */
async function doEdit(client: SDK.NeolaceApiClient, ...edits: SDK.AnyEdit[]): Promise<void> {
    const draftDefaults = { title: "A Test Draft" };
    return client.createDraft({
        ...draftDefaults,
        edits,
    }).then((draft) => client.acceptDraft(draft.num));
}

group("edit tests", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const ponderosaEntryId = defaultData.entries.ponderosaPine.id;

    group("Setting entry name and description", () => {
        test("We can change an entry's name and description", async () => {
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const before = await client.getEntry(ponderosaEntryId);
            await doEdit(
                client,
                { code: SDK.SetEntryName.code, data: { entryId: ponderosaEntryId, name: "New Name 👍" } },
                { code: SDK.SetEntryDescription.code, data: { entryId: ponderosaEntryId, description: "👍👍👍" } },
            );
            const after = await client.getEntry(ponderosaEntryId);
            assertEquals(before.name, defaultData.entries.ponderosaPine.name);
            assertEquals(after.name, "New Name 👍");
            assertEquals(before.description, defaultData.entries.ponderosaPine.description);
            assertEquals(after.description, "👍👍👍");
        });

        test("We can NOT change another site's entry's name", async () => {
            // Get an API client, logged in to the *home site*, not to plant DB
            const client = await getClient(defaultData.users.admin, defaultData.otherSite.key);
            const err = await assertRejects(() =>
                doEdit(client, {
                    code: SDK.SetEntryName.code,
                    data: { entryId: ponderosaEntryId, name: "New Name 👍" },
                })
            );
            assertInstanceOf(err, SDK.InvalidEdit);
            assertEquals(err.context.entryId, ponderosaEntryId);
            assertEquals(err.message, `Cannot set change the entry's name - entry does not exist.`);
        });

        test("We can NOT change another site's entry's description", async () => {
            // Get an API client, logged in to the *home site*, not to plant DB
            const client = await getClient(defaultData.users.admin, defaultData.otherSite.key);
            const err = await assertRejects(() =>
                doEdit(client, {
                    code: SDK.SetEntryDescription.code,
                    data: { entryId: ponderosaEntryId, description: "Desc 👍" },
                })
            );
            assertInstanceOf(err, SDK.InvalidEdit);
            assertEquals(err.context.entryId, ponderosaEntryId);
            assertEquals(err.message, `Cannot set change the entry's description - entry does not exist.`);
        });
    });

    group("Adding a new property value", () => {
        test("Adding property values to an entry", async () => {
            // This test will add multiple property values to the entry "Jeffrey Pine"
            const entryId = defaultData.entries.jeffreyPine.id;
            // The property we'll be editing is "Other names"
            const propertyKey = defaultData.schema.properties.propOtherNames.key;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyKey === propertyKey)?.value;

            // At first, the property has no value:
            assertEquals(getValue(before), undefined);

            // Now we give it a value:
            await doEdit(client, {
                code: SDK.AddPropertyFact.code,
                data: {
                    entryId,
                    propertyKey,
                    propertyFactId: VNID(),
                    valueExpression: `"Jeffrey's pine"`,
                },
            });
            const valueAfterEdit1 = getValue(await getEntry());
            assert(valueAfterEdit1?.type === "String");
            assertEquals(valueAfterEdit1.value, "Jeffrey's pine");
            assertEquals(valueAfterEdit1.annotations?.note, undefined);
            assertEquals(valueAfterEdit1.annotations?.rank, { type: "Integer", value: "1" }); // Is a string since our number type is bigint, which doesn't JSON serialize as Number

            // Now we give it a second value:

            await doEdit(client, {
                code: SDK.AddPropertyFact.code,
                data: {
                    entryId,
                    propertyKey,
                    propertyFactId: VNID(),
                    valueExpression: `"pin de Jeffrey"`,
                    note: "(French)",
                },
            });
            const valueAfterEdit2 = getValue(await getEntry());
            assert(valueAfterEdit2?.type === "Page");
            assertEquals(valueAfterEdit2.values.length, 2);
            // The first value is unchanged:
            assert(valueAfterEdit2.values[0].type === "String");
            assertEquals(valueAfterEdit2.values[0].value, "Jeffrey's pine");
            // The second value is added:
            assert(valueAfterEdit2.values[1].type === "String");
            assertEquals(valueAfterEdit2.values[1].value, "pin de Jeffrey");
            // The second value has a rank of 2 automatically assigned:
            assertEquals(valueAfterEdit2.values[1].annotations?.rank, { type: "Integer", value: "2" });
            assertEquals(valueAfterEdit2.values[1].annotations?.note, {
                type: "InlineMarkdownString",
                value: "(French)",
            });
        });

        test("When we create a relationship to a non-existent entry, we get a relevant error message.", async () => {
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const propertyKey = defaultData.schema.properties.hasPart.key;

            // delete a property fact that does not exist:
            const err = await assertRejects(() =>
                doEdit(client, {
                    code: SDK.AddPropertyFact.code,
                    data: {
                        entryId: ponderosaEntryId,
                        propertyKey,
                        propertyFactId: VNID(),
                        /** Value expression: a lookup expression giving the value */
                        valueExpression: `entry("_FOOBAR")`,
                    },
                })
            );
            assertInstanceOf(err, SDK.InvalidEdit);
            assertEquals(err.context.propertyKey, propertyKey);
            assertEquals(err.context.toEntryId, VNID("_FOOBAR"));
            assertEquals(err.context.fromEntryId, ponderosaEntryId);
            assertEquals(
                err.message,
                `Target entry not found - cannot set that non-existent entry as a relationship property value.`,
            );
        });
    });

    group("Updating a property value", () => {
        test("We can update an entry's property value", async () => {
            // This test will change the scientific name of "Ponderosa Pine"
            const entryId = defaultData.entries.ponderosaPine.id;
            const propertyKey = defaultData.schema.properties.propScientificName.key;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyKey === propertyKey)?.value;

            // At first, the property is "Pinus ponderosa":
            const beforeValue = getValue(before);
            assert(beforeValue?.type === "InlineMarkdownString");
            // Because "Scientific name" gets italicized automatically, we have to read the "plainValue":
            assertEquals(beforeValue.annotations?.plainValue, { type: "String", value: "Pinus ponderosa" });
            assert(beforeValue.annotations?.propertyFactId.type === "String");
            const propertyFactId = VNID(beforeValue.annotations.propertyFactId.value);

            // Now we change the property value:
            await doEdit(client, {
                code: SDK.UpdatePropertyFact.code,
                data: {
                    entryId,
                    propertyFactId,
                    valueExpression: `"New value"`,
                },
            });

            const afterValue = getValue(await getEntry());
            assert(afterValue?.type === "InlineMarkdownString");
            assertEquals(afterValue.annotations?.plainValue, { type: "String", value: "New value" });
        });

        test("We can update an entry's relationship property value", async () => {
            // This test will change the parent genus of "Ponderosa Pine"
            const entryId = defaultData.entries.ponderosaPine.id;
            const propertyKey = defaultData.schema.properties.parentGenus.key;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyKey === propertyKey)?.value;

            // At first, the property is "Pinus ponderosa":
            const beforeValue = getValue(before);
            assert(beforeValue?.type === "Entry");
            // The original value of "Parent Genus" is "genus Pinus":
            assertEquals(beforeValue.id, defaultData.entries.genusPinus.id);
            assert(beforeValue.annotations?.propertyFactId.type === "String");
            const propertyFactId = VNID(beforeValue.annotations.propertyFactId.value);

            // Now we change the property value:
            const newGenusId = defaultData.entries.genusThuja.id;
            await doEdit(client, {
                code: SDK.UpdatePropertyFact.code,
                data: {
                    entryId,
                    propertyFactId,
                    valueExpression: `entry("${newGenusId}")`,
                },
            });

            const afterValue = getValue(await getEntry());
            assert(afterValue?.type === "Entry");
            assertEquals(afterValue.id, newGenusId);
            // And to test that the "direct relationships" were updated correctly, we use ancestors(), because the
            // ancestors() function doesn't check PropertyFact entries but rather uses the direct IS_A relationships.
            const result = await client.evaluateLookupExpression(`entry("${entryId}").ancestors().first()`);
            assert(result.resultValue.type === "Entry");
            assertEquals(result.resultValue.id, newGenusId);
        });
    });

    group("Deleting property values", () => {
        test("We can delete a property on an entry", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);
            const originalEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const propertyFact = originalEntry.propertiesSummary?.find(
                (e) => e.propertyKey === defaultData.schema.properties.parentFamily.key,
            );

            //  check the property exists
            assert(propertyFact?.value.type === "Entry");
            assertEquals(propertyFact?.value.id, defaultData.entries.familyCupressaceae.id);

            // now delete the property value
            await doEdit(client, {
                code: SDK.DeletePropertyFact.code,
                data: {
                    entryId: originalEntry.id,
                    propertyFactId: VNID((propertyFact.value.annotations?.propertyFactId as SDK.StringValue).value),
                },
            });

            // check that the property got deleted.
            const modifiedEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const newPropertyFact = modifiedEntry.propertiesSummary?.find(
                (e) => e.propertyKey === defaultData.schema.properties.parentFamily.key,
            );

            assertEquals(newPropertyFact, undefined);

            // check the length of property summary that it decreased by three (minus deleted rel and auto-generated
            // rels from parent)

            assertEquals(modifiedEntry.propertiesSummary?.length, originalEntry.propertiesSummary!.length - 3);
        });

        // TODO: check if permissions are enforced.
    });

    group("Deleting an entry", () => {
        test("We can delete an entry, but only if it has no relationships", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const entryId = defaultData.entries.jeffreyPine.id;

            // Try to delete an entry. It should fail:
            const doDelete = () => doEdit(client, { code: SDK.DeleteEntry.code, data: { entryId } });
            await assertRejects(
                doDelete,
                SDK.InvalidEdit,
                "For now, entries with relationships cannot be deleted. Remove the relationships, then delete the entry.",
            );

            // Now delete the relationship:
            const entryData = await client.getEntry(entryId, { flags: [SDK.GetEntryFlags.IncludeRawProperties] });
            const propertyValue = entryData.propertiesRaw?.find((p) =>
                p.propertyKey === defaultData.schema.properties.parentGenus.key
            );
            const relationshipId = propertyValue?.facts[0].id;
            if (!relationshipId) {
                throw new Error("Test error - couldn't determine relationship property fact ID.");
            }
            await doEdit(client, {
                code: SDK.DeletePropertyFact.code,
                data: { entryId, propertyFactId: relationshipId },
            });

            // Now the delete should succeed:
            await doDelete();

            await assertRejects(() => client.getEntry(entryId), SDK.NotFound);
        });
    });

    group("Schema edit: Deleting an entry type", () => {
        test("We can delete an entry type, but only if no entries exist of that type", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            // first, create the entry type (in the schema)
            const entryTypeKey = "ET1";
            await doEdit(client, {
                code: SDK.CreateEntryType.code,
                data: {
                    key: entryTypeKey,
                    name: "Temp Entry Type",
                },
            });

            // Create an entry of that type
            const entryId = VNID();
            await doEdit(client, {
                code: SDK.CreateEntry.code,
                data: {
                    entryId: entryId,
                    description: "Test entry",
                    key: "entry-test",
                    name: "Test Entry",
                    entryTypeKey,
                },
            });

            // Now try to delete the property from the schema. It should fail:
            const doDelete = () => doEdit(client, { code: SDK.DeleteEntryType.code, data: { entryTypeKey } });
            await assertRejects(
                doDelete,
                SDK.InvalidEdit,
                "Entry types cannot be deleted while there are still entries of that type.",
            );

            // Now delete the entry:
            await doEdit(client, { code: SDK.DeleteEntry.code, data: { entryId } });

            // Now the delete should succeed:
            await doDelete();

            const schema = await client.getSiteSchema({ siteKey: defaultData.site.key });

            assertFalse(Object.keys(schema.entryTypes).includes(entryTypeKey));
        });
    });

    group("Schema edit: Deleting a property", () => {
        test("We can delete a property, but only if no entries exist with values set for that property", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            // first, create the property (in the schema)
            const propertyKey = "P1";
            await doEdit(client, {
                code: SDK.CreateProperty.code,
                data: {
                    key: propertyKey,
                    name: "Temp Property",
                    appliesTo: [{ entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key }],
                    type: SDK.PropertyType.Value,
                },
            });

            // Set a property fact on an entry
            const entryId = defaultData.entries.jackPine.id;
            const propertyFactId = VNID();
            await doEdit(client, {
                code: SDK.AddPropertyFact.code,
                data: {
                    entryId,
                    propertyKey,
                    propertyFactId,
                    valueExpression: `"This is a temporary value."`,
                },
            });

            // Now try to delete the property from the schema. It should fail:
            const doDelete = () => doEdit(client, { code: SDK.DeleteProperty.code, data: { key: propertyKey } });
            await assertRejects(
                doDelete,
                SDK.InvalidEdit,
                "Properties cannot be deleted while there are still entries with values set for that property.",
            );

            // Now delete the property fact from the entry:
            await doEdit(client, { code: SDK.DeletePropertyFact.code, data: { entryId, propertyFactId } });

            // Now the delete should succeed:
            await doDelete();

            const schema = await client.getSiteSchema({ siteKey: defaultData.site.key });

            assertFalse(Object.keys(schema.properties).includes(propertyKey));
        });
    });
});
