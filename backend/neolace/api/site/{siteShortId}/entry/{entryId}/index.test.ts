import { group, test, setTestIsolation, api, getClient, assertEquals, assertThrowsAsync, assertObjectMatch } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Get entry API", () => {

        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
        const speciesEntryType = defaultData.schema.entryTypes._ETSPECIES;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("Throws an error when an entry doesn't exist", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            await assertThrowsAsync(
                () => client.getEntry("non-existent-entry", {}),
                api.NotFound,
                `Entry with key "non-existent-entry" not found.`,
            );
        });

        const basicResultExpected = {
            id: ponderosaPine.id,
            name: ponderosaPine.name,
            friendlyId: ponderosaPine.friendlyId,
            description: "Pinus ponderosa (ponderosa pine) is a species of large pine tree in North America, whose bark resembles puzzle pieces.",
            type: {
                id: speciesEntryType.id,
                name: speciesEntryType.name,
                contentType: speciesEntryType.contentType,
            },
        };

        test("Get basic information about an entry", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId);

            assertEquals(result, basicResultExpected);
        });

        test("Get basic information about an entry plus detailed relationship information", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludeRelationshipFacts] as const});

            assertObjectMatch(result, {...basicResultExpected, relationshipFacts: [
                // The species "Pinus Ponderosa" is a member of the genus "Pinus":
                {
                    distance: 0,
                    toEntry: {
                        //id: ...,
                        name: "Pinus",
                        friendlyId: "g-pinus",
                    },
                    entry: {
                        id: ponderosaPine.id,
                        name: ponderosaPine.name,
                        friendlyId: ponderosaPine.friendlyId,
                    },
                    relProps: {
                        // The ID of this relationship:
                        // id: ...,
                        weight: null,
                    },
                    relType: {
                        id: defaultData.schema.relationshipTypes._SisG.id,
                    },
                },
            ]});
        });

        test("Can look up an entry by friendlyId or VNID", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const [resultFriendlyId, resultVNID] = await Promise.all([
                client.getEntry(ponderosaPine.friendlyId),
                client.getEntry(ponderosaPine.id),
            ]);

            assertEquals(resultFriendlyId, resultVNID);
            assertEquals(resultFriendlyId.name, ponderosaPine.name);
        });

    })
});
