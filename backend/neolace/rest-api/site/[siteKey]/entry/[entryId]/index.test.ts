import {
    assertEquals,
    assertObjectMatch,
    assertRejects,
    getClient,
    group,
    SDK,
    setTestIsolation,
    test,
} from "neolace/rest-api/tests.ts";

group("entry/index.test.ts", () => {
    group("Get entry API", () => {
        // These tests are read-only so don't need isolation, but do use the default plantDB example data:
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);
        const speciesEntryType = defaultData.schema.entryTypes.ETSPECIES;
        const ponderosaPine = defaultData.entries.ponderosaPine;

        test("Throws an error when an entry doesn't exist", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            await assertRejects(
                () => client.getEntry("non-existent-entry", {}),
                SDK.NotFound,
                `Entry with key "non-existent-entry" not found.`,
            );
        });

        const basicResultExpected = {
            id: ponderosaPine.id,
            name: ponderosaPine.name,
            key: ponderosaPine.key,
            description: ponderosaPine.description,
            entryType: {
                key: speciesEntryType.key,
                name: speciesEntryType.name,
            },
        };

        test("Get basic information about an entry", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntry(ponderosaPine.key);

            assertEquals<unknown>(result, basicResultExpected);
        });

        test("Get basic information about an entry plus a summary of properties", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntry(ponderosaPine.key, {
                flags: [SDK.GetEntryFlags.IncludePropertiesSummary] as const,
            });

            const defaultAnnotations = {
                // Default annotations on the value of a "normal" property value:
                propertyFactId: { type: "String" },
                rank: { type: "Integer", value: "1" },
                source: { type: "String", value: "ThisEntry" },
            };

            assertObjectMatch(result, {
                ...basicResultExpected,
                propertiesSummary: [
                    // The parent Genus of this species:
                    {
                        propertyKey: defaultData.schema.properties.parentGenus.key,
                        value: {
                            type: "Entry",
                            id: defaultData.entries.genusPinus.id,
                            annotations: {
                                ...defaultAnnotations,
                            },
                        },
                    },
                    // Scientific name:
                    {
                        propertyKey: defaultData.schema.properties.propScientificName.key,
                        value: {
                            type: "InlineMarkdownString",
                            value: "*Pinus ponderosa*",
                            annotations: {
                                ...defaultAnnotations,
                                plainValue: { value: "Pinus ponderosa", type: "String" },
                            },
                        },
                    },
                    // The species "Pinus Ponderosa" is a member of the genus "Pinus", and so on:
                    {
                        propertyKey: defaultData.schema.properties.taxonomy.key,
                        value: {
                            type: "Page",
                            startedAt: 0,
                            totalCount: 5,
                            pageSize: 5,
                            values: [
                                {
                                    type: "Entry",
                                    id: defaultData.entries.genusPinus.id,
                                    annotations: { distance: { type: "Integer", value: "1" } },
                                },
                                {
                                    type: "Entry",
                                    id: defaultData.entries.familyPinaceae.id,
                                    annotations: { distance: { type: "Integer", value: "2" } },
                                },
                                {
                                    type: "Entry",
                                    id: defaultData.entries.orderPinales.id,
                                    annotations: { distance: { type: "Integer", value: "3" } },
                                },
                                {
                                    type: "Entry",
                                    id: defaultData.entries.classPinopsida.id,
                                    annotations: { distance: { type: "Integer", value: "4" } },
                                },
                                {
                                    type: "Entry",
                                    id: defaultData.entries.divisionTracheophyta.id,
                                    annotations: { distance: { type: "Integer", value: "5" } },
                                },
                            ],
                            source: {
                                expr:
                                    `entry("${ponderosaPine.id}").get(prop=prop("${defaultData.schema.properties.taxonomy.key}"))`,
                                entryId: ponderosaPine.id,
                            },
                            annotations: {
                                // This value came from the default on the entry type, not the specific entry itself.
                                source: { type: "String", value: "Default" },
                            },
                        },
                    },
                    // Via "Pinopsida", this species has some plant parts:
                    {
                        propertyKey: defaultData.schema.properties.hasPart.key,
                        value: {
                            type: "Page",
                            pageSize: 5,
                            startedAt: 0,
                            totalCount: 2,
                            values: [
                                {
                                    type: "Entry",
                                    id: defaultData.entries.pollenCone.id,
                                    annotations: {
                                        ...defaultAnnotations,
                                        slot: { type: "String", value: "pollen-cone" },
                                        source: { type: "String", value: "AncestorEntry" },
                                    },
                                },
                                {
                                    type: "Entry",
                                    id: defaultData.entries.seedCone.id,
                                    annotations: {
                                        ...defaultAnnotations,
                                        slot: { type: "String", value: "seed-cone" },
                                        rank: { type: "Integer", value: "2" },
                                        source: { type: "String", value: "AncestorEntry" },
                                    },
                                },
                            ],
                            source: {
                                expr:
                                    `entry("${ponderosaPine.id}").get(prop=prop("${defaultData.schema.properties.hasPart.key}"))`,
                                entryId: ponderosaPine.id,
                            },
                        },
                    },
                    // Entries of Species type have "related images":
                    {
                        propertyKey: defaultData.schema.properties.relImages.key,
                        value: {
                            pageSize: 5,
                            startedAt: 0,
                            totalCount: 1,
                            type: "Page",
                            values: [
                                {
                                    type: "Image",
                                    format: "thumb",
                                    entryId: defaultData.entries.imgPonderosaTrunk.id,
                                    altText: defaultData.entries.imgPonderosaTrunk.name,
                                    blurHash: "LCDu}B~VNu9Z0LxGNH9u$zjYWCt7",
                                    contentType: "image/webp",
                                    imageUrl: ((result.propertiesSummary?.find((x) =>
                                        x.propertyKey === defaultData.schema.properties.relImages.key
                                    )?.value as SDK.PageValue).values[0] as SDK.ImageValue).imageUrl,
                                    link: {
                                        type: "Entry",
                                        id: defaultData.entries.imgPonderosaTrunk.id,
                                    },
                                    size: 1581898,
                                    sizing: "cover",
                                    width: 3504,
                                    height: 2336,
                                },
                            ],
                            source: {
                                expr:
                                    `entry("${ponderosaPine.id}").get(prop=prop("${defaultData.schema.properties.relImages.key}"))`,
                                entryId: ponderosaPine.id,
                            },
                            annotations: {
                                source: { type: "String", value: "Default" },
                            },
                        },
                    },
                    // Wikidata item ID, a regular (non "simple") property
                    {
                        propertyKey: defaultData.schema.properties.propWikidataQID.key,
                        value: {
                            type: "InlineMarkdownString",
                            value: "[Q460523](https://www.wikidata.org/wiki/Q460523)",
                            annotations: {
                                ...defaultAnnotations,
                                plainValue: { type: "String", value: "Q460523" },
                            },
                        },
                    },
                ],
            });
        });

        test("Get basic information about an entry plus a 'reference cache' with details of entries mentioned in property summary", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntry(ponderosaPine.key, {
                flags: [SDK.GetEntryFlags.IncludePropertiesSummary, SDK.GetEntryFlags.IncludeReferenceCache] as const,
            });

            assertEquals(result.referenceCache, {
                entryTypes: {
                    [defaultData.schema.entryTypes.ETDIVISION.key]: {
                        key: defaultData.schema.entryTypes.ETDIVISION.key,
                        name: defaultData.schema.entryTypes.ETDIVISION.name,
                        color: defaultData.schema.entryTypes.ETDIVISION.color,
                        abbreviation: defaultData.schema.entryTypes.ETDIVISION.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETCLASS.key]: {
                        key: defaultData.schema.entryTypes.ETCLASS.key,
                        name: defaultData.schema.entryTypes.ETCLASS.name,
                        color: defaultData.schema.entryTypes.ETCLASS.color,
                        abbreviation: defaultData.schema.entryTypes.ETCLASS.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETORDER.key]: {
                        key: defaultData.schema.entryTypes.ETORDER.key,
                        name: defaultData.schema.entryTypes.ETORDER.name,
                        color: defaultData.schema.entryTypes.ETORDER.color,
                        abbreviation: defaultData.schema.entryTypes.ETORDER.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETFAMILY.key]: {
                        key: defaultData.schema.entryTypes.ETFAMILY.key,
                        name: defaultData.schema.entryTypes.ETFAMILY.name,
                        color: defaultData.schema.entryTypes.ETFAMILY.color,
                        abbreviation: defaultData.schema.entryTypes.ETFAMILY.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETGENUS.key]: {
                        key: defaultData.schema.entryTypes.ETGENUS.key,
                        name: defaultData.schema.entryTypes.ETGENUS.name,
                        color: defaultData.schema.entryTypes.ETGENUS.color,
                        abbreviation: defaultData.schema.entryTypes.ETGENUS.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETSPECIES.key]: {
                        key: defaultData.schema.entryTypes.ETSPECIES.key,
                        name: defaultData.schema.entryTypes.ETSPECIES.name,
                        color: defaultData.schema.entryTypes.ETSPECIES.color,
                        abbreviation: defaultData.schema.entryTypes.ETSPECIES.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETPLANTPART.key]: {
                        key: defaultData.schema.entryTypes.ETPLANTPART.key,
                        name: defaultData.schema.entryTypes.ETPLANTPART.name,
                        color: defaultData.schema.entryTypes.ETPLANTPART.color,
                        abbreviation: defaultData.schema.entryTypes.ETPLANTPART.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETIMAGE.key]: {
                        key: defaultData.schema.entryTypes.ETIMAGE.key,
                        name: defaultData.schema.entryTypes.ETIMAGE.name,
                        color: defaultData.schema.entryTypes.ETIMAGE.color,
                        abbreviation: defaultData.schema.entryTypes.ETIMAGE.abbreviation,
                    },
                },
                entries: {
                    [defaultData.entries.divisionTracheophyta.id]: {
                        ...defaultData.entries.divisionTracheophyta,
                        entryType: { key: defaultData.schema.entryTypes.ETDIVISION.key },
                    },
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: { key: defaultData.schema.entryTypes.ETCLASS.key },
                    },
                    [defaultData.entries.orderPinales.id]: {
                        ...defaultData.entries.orderPinales,
                        entryType: { key: defaultData.schema.entryTypes.ETORDER.key },
                    },
                    [defaultData.entries.familyPinaceae.id]: {
                        ...defaultData.entries.familyPinaceae,
                        entryType: { key: defaultData.schema.entryTypes.ETFAMILY.key },
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: { key: defaultData.schema.entryTypes.ETGENUS.key },
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: { key: defaultData.schema.entryTypes.ETSPECIES.key },
                    },
                    [defaultData.entries.seedCone.id]: {
                        ...defaultData.entries.seedCone,
                        entryType: { key: defaultData.schema.entryTypes.ETPLANTPART.key },
                    },
                    [defaultData.entries.pollenCone.id]: {
                        ...defaultData.entries.pollenCone,
                        entryType: { key: defaultData.schema.entryTypes.ETPLANTPART.key },
                    },
                    // Image referenced by "related images":
                    [defaultData.entries.imgPonderosaTrunk.id]: {
                        ...defaultData.entries.imgPonderosaTrunk,
                        entryType: { key: defaultData.schema.entryTypes.ETIMAGE.key },
                    },
                },
                properties: {
                    [defaultData.schema.properties.parentGenus.key]: {
                        key: defaultData.schema.properties.parentGenus.key,
                        name: defaultData.schema.properties.parentGenus.name,
                        type: defaultData.schema.properties.parentGenus.type,
                        description: defaultData.schema.properties.parentGenus.description,
                        rank: defaultData.schema.properties.parentGenus.rank,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties.taxonomy.key]: {
                        key: defaultData.schema.properties.taxonomy.key,
                        name: defaultData.schema.properties.taxonomy.name,
                        type: defaultData.schema.properties.taxonomy.type,
                        description: defaultData.schema.properties.taxonomy.description,
                        rank: defaultData.schema.properties.taxonomy.rank,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties.propScientificName.key]: {
                        key: defaultData.schema.properties.propScientificName.key,
                        name: defaultData.schema.properties.propScientificName.name,
                        type: defaultData.schema.properties.propScientificName.type,
                        description: defaultData.schema.properties.propScientificName.description,
                        rank: defaultData.schema.properties.propScientificName.rank,
                        standardURL: "",
                        displayAs: defaultData.schema.properties.propScientificName.displayAs,
                    },
                    [defaultData.schema.properties.hasPart.key]: {
                        key: defaultData.schema.properties.hasPart.key,
                        name: defaultData.schema.properties.hasPart.name,
                        type: defaultData.schema.properties.hasPart.type,
                        description: defaultData.schema.properties.hasPart.description,
                        rank: defaultData.schema.properties.hasPart.rank,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties.propWikidataQID.key]: {
                        key: defaultData.schema.properties.propWikidataQID.key,
                        name: defaultData.schema.properties.propWikidataQID.name,
                        type: defaultData.schema.properties.propWikidataQID.type,
                        description: defaultData.schema.properties.propWikidataQID.description,
                        rank: defaultData.schema.properties.propWikidataQID.rank,
                        standardURL: "",
                        displayAs: defaultData.schema.properties.propWikidataQID.displayAs,
                    },
                    [defaultData.schema.properties.relImages.key]: {
                        key: defaultData.schema.properties.relImages.key,
                        name: defaultData.schema.properties.relImages.name,
                        type: defaultData.schema.properties.relImages.type,
                        description: defaultData.schema.properties.relImages.description,
                        rank: defaultData.schema.properties.relImages.rank,
                        standardURL: "",
                        displayAs: "",
                    },
                },
                lookups: [],
            });
        });

        test("Get basic information about an entry plus a 'reference cache' with details of entries mentioned in article text", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntry(ponderosaPine.key, {
                flags: [SDK.GetEntryFlags.IncludeFeatures, SDK.GetEntryFlags.IncludeReferenceCache] as const,
            });

            assertEquals(result.referenceCache, {
                entryTypes: {
                    // The hero image feature references an image:
                    [defaultData.schema.entryTypes.ETIMAGE.key]: {
                        key: defaultData.schema.entryTypes.ETIMAGE.key,
                        name: defaultData.schema.entryTypes.ETIMAGE.name,
                        color: defaultData.schema.entryTypes.ETIMAGE.color,
                        abbreviation: defaultData.schema.entryTypes.ETIMAGE.abbreviation,
                    },
                    // The text only mentions these entries:
                    [defaultData.schema.entryTypes.ETCLASS.key]: {
                        key: defaultData.schema.entryTypes.ETCLASS.key,
                        name: defaultData.schema.entryTypes.ETCLASS.name,
                        color: defaultData.schema.entryTypes.ETCLASS.color,
                        abbreviation: defaultData.schema.entryTypes.ETCLASS.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETGENUS.key]: {
                        key: defaultData.schema.entryTypes.ETGENUS.key,
                        name: defaultData.schema.entryTypes.ETGENUS.name,
                        color: defaultData.schema.entryTypes.ETGENUS.color,
                        abbreviation: defaultData.schema.entryTypes.ETGENUS.abbreviation,
                    },
                    [defaultData.schema.entryTypes.ETSPECIES.key]: {
                        key: defaultData.schema.entryTypes.ETSPECIES.key,
                        name: defaultData.schema.entryTypes.ETSPECIES.name,
                        color: defaultData.schema.entryTypes.ETSPECIES.color,
                        abbreviation: defaultData.schema.entryTypes.ETSPECIES.abbreviation,
                    },
                },
                entries: {
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: { key: defaultData.schema.entryTypes.ETCLASS.key },
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: { key: defaultData.schema.entryTypes.ETGENUS.key },
                    },
                    [defaultData.entries.jeffreyPine.id]: {
                        ...defaultData.entries.jeffreyPine,
                        entryType: { key: defaultData.schema.entryTypes.ETSPECIES.key },
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: { key: defaultData.schema.entryTypes.ETSPECIES.key },
                    },
                    [defaultData.entries.imgPonderosaTrunk.id]: {
                        ...defaultData.entries.imgPonderosaTrunk,
                        entryType: { key: defaultData.schema.entryTypes.ETIMAGE.key },
                    },
                },
                properties: {
                    /* We didn't include the properties summary, so no properties should be referenced. */
                },
                lookups: [],
            });
        });

        /*
        test("The summary of properties will display an error if a simple property value is invalid", async () => {

            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const draft = await client.createDraft({title: "Change simple property value", description: null, edits: [
                {code: api.UpdateEntryType.code, data: {
                    key: defaultData.schema.entryTypes.ETSPECIES.key,
                    addOrUpdateSimpleProperties: [{
                        key: defaultData.schema.properties.taxonomy.key,
                        label: "Broken Taxonomy",
                        rank: 5,
                        valueExpression: "this is an invalid expression",
                        note: "",
                    }],
                    removeSimpleProperties: [defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesParts.id],
                }},
                // Delete the other properties from Ponderosa Pine:
                {code: api.UpdatePropertyFact.code, data: {
                    entry: defaultData.entries.ponderosaPine.id,
                    property: defaultData.entries.propertyScientificName.id,
                    valueExpression: "",  // Delete this property value
                    note: "",
                }},
                // Delete the other properties from Ponderosa Pine:
                {code: api.UpdatePropertyFact.code, data: {
                    entry: defaultData.entries.ponderosaPine.id,
                    property: defaultData.entries.propertyWikidataItemId.id,
                    valueExpression: "",  // Delete this property value
                    note: "",
                }},
            ]});
            await client.acceptDraft(draft.id);

            const result = await client.getEntry(ponderosaPine.key, {flags: [api.GetEntryFlags.IncludePropertiesSummary] as const});

            assertEquals(result, {...basicResultExpected, propertiesSummary: [
                // This property value is now invalid:
                {
                    type: "SimplePropertyValue",
                    key: defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesTaxonomy.id,
                    label: "Broken Taxonomy",
                    rank: 5,
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
                    key: defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesRelImg.id,
                    rank: defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesRelImg.rank,
                    label: defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesRelImg.label,
                    note: defaultData.schema.entryTypes.ETSPECIES.simplePropValues._CFSpeciesRelImg.note,
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
        });*/

        test("Can fetch all raw properties directly set on a given entry (e.g. for editing or export purposes", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const result = await client.getEntry(ponderosaPine.id, {
                flags: [SDK.GetEntryFlags.IncludeRawProperties] as const,
            });

            const propFactDefaults = { rank: 1, slot: "", note: "" };
            assertEquals(result.propertiesRaw, [
                {
                    propertyKey: defaultData.schema.properties.parentGenus.key,
                    facts: [{
                        valueExpression: `entry("${defaultData.entries.genusPinus.id}")`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[0].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyKey: defaultData.schema.properties.propScientificName.key,
                    facts: [{
                        valueExpression: `"Pinus ponderosa"`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[1].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyKey: defaultData.schema.properties.propWikidataQID.key,
                    facts: [{
                        valueExpression: `"Q460523"`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[2].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyKey: defaultData.schema.properties.hasHeroImage.key,
                    facts: [{
                        valueExpression: `entry("${defaultData.entries.imgPonderosaTrunk.id}")`,
                        ...propFactDefaults,
                        note: "a ponderosa pine trunk in Lassen Volcanic National Park",
                        id: result.propertiesRaw[3].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
            ]);
        });

        test("Can look up an entry by key or VNID", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.key);

            const [resultKey, resultVNID] = await Promise.all([
                client.getEntry(ponderosaPine.key),
                client.getEntry(ponderosaPine.id),
            ]);

            assertEquals(resultKey, resultVNID);
            assertEquals(resultKey.name, ponderosaPine.name);
        });
    });
});
