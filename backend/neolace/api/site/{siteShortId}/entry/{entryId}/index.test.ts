import {
    api,
    assertEquals,
    assertObjectMatch,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";

group("entry/index.test.ts", () => {
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

            assertEquals<unknown>(result, basicResultExpected);
        });

        test("Get basic information about an entry plus a summary of properties", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {
                flags: [api.GetEntryFlags.IncludePropertiesSummary] as const,
            });

            const defaultAnnotations = {
                // Default annotations on the value of a "normal" property value:
                propertyFactId: { type: "String" },
                note: { type: "InlineMarkdownString", value: "" },
                rank: { type: "Integer", value: "1" },
                slot: { type: "Null" },
                source: { type: "String", value: "ThisEntry" },
            };

            assertObjectMatch(result, {
                ...basicResultExpected,
                propertiesSummary: [
                    // The parent Genus of this species:
                    {
                        propertyId: defaultData.schema.properties._parentGenus.id,
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
                        propertyId: defaultData.schema.properties._propScientificName.id,
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
                        propertyId: defaultData.schema.properties._taxonomy.id,
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
                            source: { expr: "this.ancestors()", entryId: ponderosaPine.id },
                            annotations: {
                                // This value came from the default on the entry type, not the specific entry itself.
                                source: { type: "String", value: "Default" },
                            },
                        },
                    },
                    // Via "Pinopsida", this species has some plant parts:
                    {
                        propertyId: defaultData.schema.properties._hasPart.id,
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
                                expr: `this.get(prop=[[/prop/${defaultData.schema.properties._hasPart.id}]])`,
                                entryId: ponderosaPine.id,
                            },
                        },
                    },
                    // Entries of Species type have "related images":
                    {
                        propertyId: defaultData.schema.properties._relImages.id,
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
                                        x.propertyId === defaultData.schema.properties._relImages.id
                                    )?.value as api.PageValue).values[0] as api.ImageValue).imageUrl,
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
                                    `this.andDescendants().reverse(prop=[[/prop/${defaultData.schema.properties._imgRelTo.id}]])`,
                                entryId: ponderosaPine.id,
                            },
                            annotations: {
                                source: { type: "String", value: "Default" },
                            },
                        },
                    },
                    // Wikidata item ID, a regular (non "simple") property
                    {
                        propertyId: defaultData.schema.properties._propWikidataQID.id,
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
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {
                flags: [api.GetEntryFlags.IncludePropertiesSummary, api.GetEntryFlags.IncludeReferenceCache] as const,
            });

            assertEquals(result.referenceCache, {
                entryTypes: {
                    [defaultData.schema.entryTypes._ETDIVISION.id]: {
                        id: defaultData.schema.entryTypes._ETDIVISION.id,
                        name: defaultData.schema.entryTypes._ETDIVISION.name,
                        color: defaultData.schema.entryTypes._ETDIVISION.color,
                        abbreviation: defaultData.schema.entryTypes._ETDIVISION.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETCLASS.id]: {
                        id: defaultData.schema.entryTypes._ETCLASS.id,
                        name: defaultData.schema.entryTypes._ETCLASS.name,
                        color: defaultData.schema.entryTypes._ETCLASS.color,
                        abbreviation: defaultData.schema.entryTypes._ETCLASS.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETORDER.id]: {
                        id: defaultData.schema.entryTypes._ETORDER.id,
                        name: defaultData.schema.entryTypes._ETORDER.name,
                        color: defaultData.schema.entryTypes._ETORDER.color,
                        abbreviation: defaultData.schema.entryTypes._ETORDER.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETFAMILY.id]: {
                        id: defaultData.schema.entryTypes._ETFAMILY.id,
                        name: defaultData.schema.entryTypes._ETFAMILY.name,
                        color: defaultData.schema.entryTypes._ETFAMILY.color,
                        abbreviation: defaultData.schema.entryTypes._ETFAMILY.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETGENUS.id]: {
                        id: defaultData.schema.entryTypes._ETGENUS.id,
                        name: defaultData.schema.entryTypes._ETGENUS.name,
                        color: defaultData.schema.entryTypes._ETGENUS.color,
                        abbreviation: defaultData.schema.entryTypes._ETGENUS.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETSPECIES.id]: {
                        id: defaultData.schema.entryTypes._ETSPECIES.id,
                        name: defaultData.schema.entryTypes._ETSPECIES.name,
                        color: defaultData.schema.entryTypes._ETSPECIES.color,
                        abbreviation: defaultData.schema.entryTypes._ETSPECIES.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETPLANTPART.id]: {
                        id: defaultData.schema.entryTypes._ETPLANTPART.id,
                        name: defaultData.schema.entryTypes._ETPLANTPART.name,
                        color: defaultData.schema.entryTypes._ETPLANTPART.color,
                        abbreviation: defaultData.schema.entryTypes._ETPLANTPART.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETIMAGE.id]: {
                        id: defaultData.schema.entryTypes._ETIMAGE.id,
                        name: defaultData.schema.entryTypes._ETIMAGE.name,
                        color: defaultData.schema.entryTypes._ETIMAGE.color,
                        abbreviation: defaultData.schema.entryTypes._ETIMAGE.abbreviation,
                    },
                },
                entries: {
                    [defaultData.entries.divisionTracheophyta.id]: {
                        ...defaultData.entries.divisionTracheophyta,
                        entryType: { id: defaultData.schema.entryTypes._ETDIVISION.id },
                    },
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: { id: defaultData.schema.entryTypes._ETCLASS.id },
                    },
                    [defaultData.entries.orderPinales.id]: {
                        ...defaultData.entries.orderPinales,
                        entryType: { id: defaultData.schema.entryTypes._ETORDER.id },
                    },
                    [defaultData.entries.familyPinaceae.id]: {
                        ...defaultData.entries.familyPinaceae,
                        entryType: { id: defaultData.schema.entryTypes._ETFAMILY.id },
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: { id: defaultData.schema.entryTypes._ETGENUS.id },
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: { id: defaultData.schema.entryTypes._ETSPECIES.id },
                    },
                    [defaultData.entries.seedCone.id]: {
                        ...defaultData.entries.seedCone,
                        entryType: { id: defaultData.schema.entryTypes._ETPLANTPART.id },
                    },
                    [defaultData.entries.pollenCone.id]: {
                        ...defaultData.entries.pollenCone,
                        entryType: { id: defaultData.schema.entryTypes._ETPLANTPART.id },
                    },
                    // Image referenced by "related images":
                    [defaultData.entries.imgPonderosaTrunk.id]: {
                        ...defaultData.entries.imgPonderosaTrunk,
                        entryType: { id: defaultData.schema.entryTypes._ETIMAGE.id },
                    },
                },
                properties: {
                    [defaultData.schema.properties._parentGenus.id]: {
                        id: defaultData.schema.properties._parentGenus.id,
                        name: defaultData.schema.properties._parentGenus.name,
                        type: defaultData.schema.properties._parentGenus.type,
                        description: defaultData.schema.properties._parentGenus.descriptionMD,
                        importance: defaultData.schema.properties._parentGenus.importance,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties._taxonomy.id]: {
                        id: defaultData.schema.properties._taxonomy.id,
                        name: defaultData.schema.properties._taxonomy.name,
                        type: defaultData.schema.properties._taxonomy.type,
                        description: defaultData.schema.properties._taxonomy.descriptionMD,
                        importance: defaultData.schema.properties._taxonomy.importance,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties._propScientificName.id]: {
                        id: defaultData.schema.properties._propScientificName.id,
                        name: defaultData.schema.properties._propScientificName.name,
                        type: defaultData.schema.properties._propScientificName.type,
                        description: defaultData.schema.properties._propScientificName.descriptionMD,
                        importance: defaultData.schema.properties._propScientificName.importance,
                        standardURL: "",
                        displayAs: defaultData.schema.properties._propScientificName.displayAs,
                    },
                    [defaultData.schema.properties._hasPart.id]: {
                        id: defaultData.schema.properties._hasPart.id,
                        name: defaultData.schema.properties._hasPart.name,
                        type: defaultData.schema.properties._hasPart.type,
                        description: defaultData.schema.properties._hasPart.descriptionMD,
                        importance: defaultData.schema.properties._hasPart.importance,
                        standardURL: "",
                        displayAs: "",
                    },
                    [defaultData.schema.properties._propWikidataQID.id]: {
                        id: defaultData.schema.properties._propWikidataQID.id,
                        name: defaultData.schema.properties._propWikidataQID.name,
                        type: defaultData.schema.properties._propWikidataQID.type,
                        description: defaultData.schema.properties._propWikidataQID.descriptionMD,
                        importance: defaultData.schema.properties._propWikidataQID.importance,
                        standardURL: "",
                        displayAs: defaultData.schema.properties._propWikidataQID.displayAs,
                    },
                    [defaultData.schema.properties._relImages.id]: {
                        id: defaultData.schema.properties._relImages.id,
                        name: defaultData.schema.properties._relImages.name,
                        type: defaultData.schema.properties._relImages.type,
                        description: defaultData.schema.properties._relImages.descriptionMD,
                        importance: defaultData.schema.properties._relImages.importance,
                        standardURL: "",
                        displayAs: "",
                    },
                },
                lookups: [],
            });
        });

        test("Get basic information about an entry plus a 'reference cache' with details of entries mentioned in article text", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.friendlyId, {
                flags: [api.GetEntryFlags.IncludeFeatures, api.GetEntryFlags.IncludeReferenceCache] as const,
            });

            assertEquals(result.referenceCache, {
                entryTypes: {
                    // The hero image feature references an image:
                    [defaultData.schema.entryTypes._ETIMAGE.id]: {
                        id: defaultData.schema.entryTypes._ETIMAGE.id,
                        name: defaultData.schema.entryTypes._ETIMAGE.name,
                        color: defaultData.schema.entryTypes._ETIMAGE.color,
                        abbreviation: defaultData.schema.entryTypes._ETIMAGE.abbreviation,
                    },
                    // The text only mentions these entries:
                    [defaultData.schema.entryTypes._ETCLASS.id]: {
                        id: defaultData.schema.entryTypes._ETCLASS.id,
                        name: defaultData.schema.entryTypes._ETCLASS.name,
                        color: defaultData.schema.entryTypes._ETCLASS.color,
                        abbreviation: defaultData.schema.entryTypes._ETCLASS.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETGENUS.id]: {
                        id: defaultData.schema.entryTypes._ETGENUS.id,
                        name: defaultData.schema.entryTypes._ETGENUS.name,
                        color: defaultData.schema.entryTypes._ETGENUS.color,
                        abbreviation: defaultData.schema.entryTypes._ETGENUS.abbreviation,
                    },
                    [defaultData.schema.entryTypes._ETSPECIES.id]: {
                        id: defaultData.schema.entryTypes._ETSPECIES.id,
                        name: defaultData.schema.entryTypes._ETSPECIES.name,
                        color: defaultData.schema.entryTypes._ETSPECIES.color,
                        abbreviation: defaultData.schema.entryTypes._ETSPECIES.abbreviation,
                    },
                },
                entries: {
                    [defaultData.entries.classPinopsida.id]: {
                        ...defaultData.entries.classPinopsida,
                        entryType: { id: defaultData.schema.entryTypes._ETCLASS.id },
                    },
                    [defaultData.entries.genusPinus.id]: {
                        ...defaultData.entries.genusPinus,
                        entryType: { id: defaultData.schema.entryTypes._ETGENUS.id },
                    },
                    [defaultData.entries.jeffreyPine.id]: {
                        ...defaultData.entries.jeffreyPine,
                        entryType: { id: defaultData.schema.entryTypes._ETSPECIES.id },
                    },
                    [defaultData.entries.ponderosaPine.id]: {
                        ...defaultData.entries.ponderosaPine,
                        entryType: { id: defaultData.schema.entryTypes._ETSPECIES.id },
                    },
                    [defaultData.entries.imgPonderosaTrunk.id]: {
                        ...defaultData.entries.imgPonderosaTrunk,
                        entryType: { id: defaultData.schema.entryTypes._ETIMAGE.id },
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

            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const draft = await client.createDraft({title: "Change simple property value", description: null, edits: [
                {code: api.UpdateEntryType.code, data: {
                    id: defaultData.schema.entryTypes._ETSPECIES.id,
                    addOrUpdateSimpleProperties: [{
                        id: defaultData.schema.properties._taxonomy.id,
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
        });*/

        test("Can fetch all raw properties directly set on a given entry (e.g. for editing or export purposes", async () => {
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const result = await client.getEntry(ponderosaPine.id, {
                flags: [api.GetEntryFlags.IncludeRawProperties] as const,
            });

            const propFactDefaults = { rank: 1, slot: "", note: "" };
            assertEquals(result.propertiesRaw, [
                {
                    propertyId: defaultData.schema.properties._parentGenus.id,
                    facts: [{
                        valueExpression: `[[/entry/${defaultData.entries.genusPinus.id}]]`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[0].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyId: defaultData.schema.properties._propScientificName.id,
                    facts: [{
                        valueExpression: `"Pinus ponderosa"`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[1].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyId: defaultData.schema.properties._propWikidataQID.id,
                    facts: [{
                        valueExpression: `"Q460523"`,
                        ...propFactDefaults,
                        id: result.propertiesRaw[2].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
                {
                    propertyId: defaultData.schema.properties._hasHeroImage.id,
                    facts: [{
                        valueExpression: `[[/entry/${defaultData.entries.imgPonderosaTrunk.id}]]`,
                        ...propFactDefaults,
                        note: "a ponderosa pine trunk in Lassen Volcanic National Park",
                        id: result.propertiesRaw[3].facts[0].id, // We don't know the propertyFactId so just compare it to itself
                    }],
                },
            ]);
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
    });
});
