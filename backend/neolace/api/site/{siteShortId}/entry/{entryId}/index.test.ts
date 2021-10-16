import { group, test, setTestIsolation, api, getClient, assertEquals, assertRejects } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Get entry API", () => {

        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const speciesEntryType = defaultData.schema.entryTypes._ETSPECIES;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("Throws an error when an entry doesn't exist", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            await assertRejects(
                () => client.getEntry("non-existent-entry", {}),
                api.NotFound,
                `Entry with key "non-existent-entry" not found.`,
            );
        });

        const basicResultExpected = {
            id: ponderosaPine.id,
            name: ponderosaPine.name,
            friendlyId: ponderosaPine.friendlyId,
            description: ponderosaPine.description,
            entryType: {
                id: speciesEntryType.id,
                name: speciesEntryType.name,
            },
        };

        test("Get basic information about an entry", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId);

            assertEquals(result, basicResultExpected);
        });

        test("Get basic information about an entry plus a summary of properties", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludePropertiesSummary] as const});

            assertEquals(result, {...basicResultExpected, propertiesSummary: [
                // The species "Pinus Ponderosa" is a member of the genus "Pinus", and so on:
                {
                    type: "SimplePropertyValue",
                    id: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesTaxonomy.id,
                    importance: 5,
                    label: "Taxonomy",
                    value: {
                        type: "Page",
                        startedAt: 0,
                        totalCount: 5,
                        pageSize: 5,
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
                    note: "",
                    source: {from: "EntryType"},
                },
                // Via "Pinopsida", this species has some plant parts:
                {
                    type: "SimplePropertyValue",
                    id: "_CFSpeciesParts",
                    importance: 10,
                    label: "Parts",
                    value: {
                        pageSize: 5,
                        startedAt: 0,
                        totalCount: 2,
                        type: "Page",
                        values: [
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.pollenCone.id,
                                annotations: { weight: { type: "Null" }, note: {type: "Null"} },
                            },
                            {
                                type: "AnnotatedEntry",
                                id: defaultData.entries.seedCone.id,
                                annotations: { weight: { type: "Null" }, note: {type: "Null"} },
                            },
                        ],
                    },
                    note: "",
                    source: {from: "EntryType"},
                },
                {
                    // Scientific name, a regular (non "simple") property
                    type: "PropertyValue",
                    id: defaultData.entries.propertyScientificName.id,
                    importance: 10,
                    label: defaultData.entries.propertyScientificName.name,
                    note: "",
                    source: { from: "ThisEntry" },
                    value: {value: "*Pinus ponderosa*", type: "InlineMarkdownString"},
                },
                {
                    // Entries of Species type have "related images":
                    type: "SimplePropertyValue",
                    id: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.id,
                    importance: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.importance,
                    label: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.label,
                    note: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.note,
                    source: { from: "EntryType" },
                    value: {
                        pageSize: 5,
                        startedAt: 0,
                        totalCount: 1,
                        type: "Page",
                        values: [
                            {annotations: {note: {type: "Null"}, weight: {type: "Null"}}, id: defaultData.entries.imgPonderosaTrunk.id, type: "AnnotatedEntry"},
                        ],
                    },
                },
                {
                    // Wikidata item ID, a regular (non "simple") property
                    type: "PropertyValue",
                    id: defaultData.entries.propertyWikidataItemId.id,
                    importance: 15,
                    label: defaultData.entries.propertyWikidataItemId.name,
                    note: "",
                    source: { from: "ThisEntry" },
                    value: {value: "[Q460523](https://www.wikidata.org/wiki/Q460523)", type: "InlineMarkdownString"},
                },
            ]});
        });

        test("Get basic information about an entry plus a 'reference cache' with details of entries mentioned in property summary", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludePropertiesSummary, api.GetEntryFlags.IncludeReferenceCache] as const});

            assertEquals(result.referenceCache, {
                entryTypes: {
                    [defaultData.schema.entryTypes._ETDIVISION.id]: {id: defaultData.schema.entryTypes._ETDIVISION.id, name: defaultData.schema.entryTypes._ETDIVISION.name},
                    [defaultData.schema.entryTypes._ETCLASS.id]: {id: defaultData.schema.entryTypes._ETCLASS.id, name: defaultData.schema.entryTypes._ETCLASS.name},
                    [defaultData.schema.entryTypes._ETORDER.id]: {id: defaultData.schema.entryTypes._ETORDER.id, name: defaultData.schema.entryTypes._ETORDER.name},
                    [defaultData.schema.entryTypes._ETFAMILY.id]: {id: defaultData.schema.entryTypes._ETFAMILY.id, name: defaultData.schema.entryTypes._ETFAMILY.name},
                    [defaultData.schema.entryTypes._ETGENUS.id]: {id: defaultData.schema.entryTypes._ETGENUS.id, name: defaultData.schema.entryTypes._ETGENUS.name},
                    [defaultData.schema.entryTypes._ETSPECIES.id]: {id: defaultData.schema.entryTypes._ETSPECIES.id, name: defaultData.schema.entryTypes._ETSPECIES.name},
                    [defaultData.schema.entryTypes._ETPROPERTY.id]: {id: defaultData.schema.entryTypes._ETPROPERTY.id, name: defaultData.schema.entryTypes._ETPROPERTY.name},
                    [defaultData.schema.entryTypes._ETPLANTPART.id]: {id: defaultData.schema.entryTypes._ETPLANTPART.id, name: defaultData.schema.entryTypes._ETPLANTPART.name},
                    [defaultData.schema.entryTypes._ETIMAGE.id]: {id: defaultData.schema.entryTypes._ETIMAGE.id, name: defaultData.schema.entryTypes._ETIMAGE.name},
                },
                entries: {
                    [defaultData.entries.divisionTracheophyta.id]: {
                        ...defaultData.entries.divisionTracheophyta,
                        entryType: {id: defaultData.schema.entryTypes._ETDIVISION.id},
                    },
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: {id: defaultData.schema.entryTypes._ETCLASS.id},
                    },
                    [defaultData.entries.orderPinales.id]: {
                        ...defaultData.entries.orderPinales,
                        entryType: {id: defaultData.schema.entryTypes._ETORDER.id},
                    },
                    [defaultData.entries.familyPinaceae.id]: {
                        ...defaultData.entries.familyPinaceae,
                        entryType: {id: defaultData.schema.entryTypes._ETFAMILY.id},
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: {id: defaultData.schema.entryTypes._ETGENUS.id},
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: {id: defaultData.schema.entryTypes._ETSPECIES.id},
                    },
                    [defaultData.entries.seedCone.id]: {
                        ...defaultData.entries.seedCone,
                        entryType: {id: defaultData.schema.entryTypes._ETPLANTPART.id},
                    },
                    [defaultData.entries.pollenCone.id]: {
                        ...defaultData.entries.pollenCone,
                        entryType: {id: defaultData.schema.entryTypes._ETPLANTPART.id},
                    },
                    [defaultData.entries.propertyScientificName.id]: {
                        ...defaultData.entries.propertyScientificName,
                        entryType: {id: defaultData.schema.entryTypes._ETPROPERTY.id},
                    },
                    [defaultData.entries.propertyWikidataItemId.id]: {
                        ...defaultData.entries.propertyWikidataItemId,
                        entryType: {id: defaultData.schema.entryTypes._ETPROPERTY.id},
                    },
                    [defaultData.entries.imgPonderosaTrunk.id]: {
                        ...defaultData.entries.imgPonderosaTrunk,
                        entryType: {id: defaultData.schema.entryTypes._ETIMAGE.id},
                    },
                },
            });
        });


        test("Get basic information about an entry plus a 'reference cache' with details of entries mentioned in article text", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludeFeatures, api.GetEntryFlags.IncludeReferenceCache] as const});

            assertEquals(result.referenceCache, {
                entryTypes: {
                    // The text only mentions these entries:
                    [defaultData.schema.entryTypes._ETCLASS.id]: {id: defaultData.schema.entryTypes._ETCLASS.id, name: defaultData.schema.entryTypes._ETCLASS.name},
                    [defaultData.schema.entryTypes._ETGENUS.id]: {id: defaultData.schema.entryTypes._ETGENUS.id, name: defaultData.schema.entryTypes._ETGENUS.name},
                    [defaultData.schema.entryTypes._ETSPECIES.id]: {id: defaultData.schema.entryTypes._ETSPECIES.id, name: defaultData.schema.entryTypes._ETSPECIES.name},
                },
                entries: {
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: {id: defaultData.schema.entryTypes._ETCLASS.id},
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: {id: defaultData.schema.entryTypes._ETGENUS.id},
                    },
                    [defaultData.entries.jeffreyPine.id]: {
                        ...defaultData.entries.jeffreyPine,
                        entryType: {id: defaultData.schema.entryTypes._ETSPECIES.id},
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: {id: defaultData.schema.entryTypes._ETSPECIES.id},
                    },
                },
            });
        });

        test("The summary of properties will display an error if a simple property value is invalid", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const draft = await client.createDraft({title: "Change simple property value", description: null, edits: [
                {code: api.UpdateEntryType.code, data: {
                    id: defaultData.schema.entryTypes._ETSPECIES.id,
                    addOrUpdateSimpleProperties: [{
                        id: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesTaxonomy.id,
                        label: "Broken Taxonomy",
                        importance: 5,
                        valueExpression: "this is an invalid expression",
                        note: "",
                    }],
                    removeSimpleProperties: [defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesParts.id],
                }},
                // Delete the other properties from Ponderosa Pine:
                {code: api.UpdatePropertyValue.code, data: {
                    entry: defaultData.entries.ponderosaPine.id,
                    property: defaultData.entries.propertyScientificName.id,
                    valueExpression: "",  // Delete this property value
                    note: "",
                }},
                // Delete the other properties from Ponderosa Pine:
                {code: api.UpdatePropertyValue.code, data: {
                    entry: defaultData.entries.ponderosaPine.id,
                    property: defaultData.entries.propertyWikidataItemId.id,
                    valueExpression: "",  // Delete this property value
                    note: "",
                }},
            ]});
            await client.acceptDraft(draft.id);

            const result = await client.getEntry(ponderosaPine.friendlyId, {flags: [api.GetEntryFlags.IncludePropertiesSummary] as const});

            assertEquals(result, {...basicResultExpected, propertiesSummary: [
                // This property value is now invalid:
                {
                    type: "SimplePropertyValue",
                    id: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesTaxonomy.id,
                    label: "Broken Taxonomy",
                    importance: 5,
                    value: {
                        type: "Error",
                        errorClass: "LookupParseError",
                        message: 'Simple/fake parser is unable to parse the lookup expression "this is an invalid expression"',
                    },
                    note: "",
                    source: {from: "EntryType"},
                },
                // The related images property is still present:
                {
                    type: "SimplePropertyValue",
                    id: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.id,
                    importance: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.importance,
                    label: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.label,
                    note: defaultData.schema.entryTypes._ETSPECIES.simplePropValues._CFSpeciesRelImg.note,
                    source: { from: "EntryType" },
                    value: {
                        pageSize: 5,
                        startedAt: 0,
                        totalCount: 1,
                        type: "Page",
                        values: [
                            {annotations: {note: {type: "Null"}, weight: {type: "Null"}}, id: defaultData.entries.imgPonderosaTrunk.id, type: "AnnotatedEntry"},
                        ],
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
