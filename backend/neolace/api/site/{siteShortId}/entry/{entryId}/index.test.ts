import { group, test, setTestIsolation, api, getClient, assertEquals, assertThrowsAsync } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Get entry API", () => {

        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
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
            description: "**Pinus ponderosa** (ponderosa pine) is a species of large pine tree in North America, whose bark resembles puzzle pieces.",
            entryType: {
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

        test("Get basic information about an entry plus a summary of computed facts", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludeComputedFactsSummary] as const});

            assertEquals(result, {...basicResultExpected, computedFactsSummary: [
                // The species "Pinus Ponderosa" is a member of the genus "Pinus", and so on:
                {
                    id: defaultData.schema.entryTypes._ETSPECIES.computedFacts._CFSpeciesTaxonomy.id,
                    label: "Taxonomy",
                    value: {
                        type: "Page",
                        startedAt: 0,
                        totalCount: 5,
                        pageSize: 100,
                        values: [
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.genusPinus.id,
                                annotations: { distance: { type: "Integer", value: "1", } },
                            },
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.familyPinaceae.id,
                                annotations: { distance: { type: "Integer", value: "2" } },
                            },
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.orderPinales.id,
                                annotations: { distance: { type: "Integer", value: "3" } },
                            },
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.classPinopsida.id,
                                annotations: { distance: { type: "Integer", value: "4"} },
                            },
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.divisionTracheophyta.id,
                                annotations: { distance: { type: "Integer", value: "5"} },
                            },
                        ],
                    },
                },
            ]});
        });

        test("The summary of computed facts will display an error if the computed fact is invalid", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const draft = await client.createDraft({title: "Change computed fact", description: null, edits: [
                {code: api.UpdateEntryType.code, data: {
                    id: defaultData.schema.entryTypes._ETSPECIES.id,
                    addOrUpdateComputedFacts: [{
                        id: defaultData.schema.entryTypes._ETSPECIES.computedFacts._CFSpeciesTaxonomy.id,
                        label: "Broken Taxonomy",
                        importance: 5,
                        expression: "this is an invalid expression",
                    }]
                }}
            ]});
            await client.acceptDraft(draft.id);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludeComputedFactsSummary] as const});

            assertEquals(result, {...basicResultExpected, computedFactsSummary: [
                // The species "Pinus Ponderosa" is a member of the genus "Pinus", and so on:
                {
                    id: defaultData.schema.entryTypes._ETSPECIES.computedFacts._CFSpeciesTaxonomy.id,
                    label: "Broken Taxonomy",
                    value: {
                        type: "Error",
                        errorClass: "QueryParseError",
                        message: 'Simple/fake parser is unable to parse the lookup expression "this is an invalid expression"',
                    },
                },
            ]});
        });

        test("Get basic information about an entry plus detailed ancestor information", async () => {

            // Note that details of ancestor retrieval are mostly tested in neolace/core/entry/ancestors.test.ts

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludeAncestors] as const});

            assertEquals(result, {...basicResultExpected, ancestors: [
                // The species "Pinus Ponderosa" is a member of the genus "Pinus":
                {
                    distance: 1,
                    id: defaultData.entries.genusPinus.id,
                    name: defaultData.entries.genusPinus.name,
                    friendlyId: defaultData.entries.genusPinus.friendlyId,
                    entryType: {id: defaultData.schema.entryTypes._ETGENUS.id},
                },
                // And so on...
                {
                    distance: 2,
                    id: defaultData.entries.familyPinaceae.id,
                    name: defaultData.entries.familyPinaceae.name,
                    friendlyId: defaultData.entries.familyPinaceae.friendlyId,
                    entryType: {id: defaultData.schema.entryTypes._ETFAMILY.id},
                },
                {
                    distance: 3,
                    id: defaultData.entries.orderPinales.id,
                    name: defaultData.entries.orderPinales.name,
                    friendlyId: defaultData.entries.orderPinales.friendlyId,
                    entryType: {id: defaultData.schema.entryTypes._ETORDER.id},
                },
                {
                    distance: 4,
                    id: defaultData.entries.classPinopsida.id,
                    name: defaultData.entries.classPinopsida.name,
                    friendlyId: defaultData.entries.classPinopsida.friendlyId,
                    entryType: {id: defaultData.schema.entryTypes._ETCLASS.id},

                },
                {
                    distance: 5,
                    id: defaultData.entries.divisionTracheophyta.id,
                    name: defaultData.entries.divisionTracheophyta.name,
                    friendlyId: defaultData.entries.divisionTracheophyta.friendlyId,
                    entryType: {id: defaultData.schema.entryTypes._ETDIVISION.id},

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
