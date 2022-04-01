import { api, assert, assertEquals, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";

group(import.meta, () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);

    group("Deleting properties", () => {
        test("We can delete a property on an entry", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const originalEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const propertyFact = originalEntry.propertiesSummary?.find(
                (e) => e.propertyId === defaultData.schema.properties._parentFamily.id,
            );

            //  check the property exists
            assert(propertyFact?.value.type === "Annotated");
            assert(propertyFact?.value.value.type === "Entry");
            assertEquals(propertyFact?.value.value.id, defaultData.entries.familyCupressaceae.id);

            const result = await client.createDraft({
                title: "A Test Draft",
                description: null,
                edits: [
                    {
                        code: api.DeletePropertyValue.code,
                        data: { propertyFactId: (propertyFact.value.annotations.factId as api.StringValue).value },
                    },
                ],
            });

            await client.acceptDraft(result.id);

            // check that the property got deleted.
            const modifiedEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const newPropertyFact = modifiedEntry.propertiesSummary?.find(
                (e) => e.propertyId === defaultData.schema.properties._parentFamily.id,
            );

            assertEquals(newPropertyFact, undefined);

            // check the length of property summary that it decreased by three (minus deleted rel and auto-generated
            // rels from parent)

            assertEquals(modifiedEntry.propertiesSummary?.length, originalEntry.propertiesSummary!.length - 3);
        });
    });
});
