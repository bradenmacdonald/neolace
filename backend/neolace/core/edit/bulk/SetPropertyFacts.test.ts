import { assertEquals, assertInstanceOf, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("SetPropertyFacts bulk edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const {
        // siteId,
        ponderosaPine,
        jackPine,
        // stonePine,
        getPropertyFacts,
        assertExists,
        doBulkEdits,
        getAppliedEdits,
    } = testHelpers(defaultData);
    const scientificNameProp = defaultData.schema.properties.propScientificName;
    const wikidataQidProp = defaultData.schema.properties.propWikidataQID;

    const checkPreconditions = async () => {
        // scientific name of ponderosa pine:
        const ponderosaSciNameBefore = await getPropertyFacts(ponderosaPine, scientificNameProp.key);
        assertEquals(ponderosaSciNameBefore.map((f) => f.valueExpression), [`"Pinus ponderosa"`]);
        // Wikidata QID of ponderosa pine:
        const ponderosaQidBefore = await getPropertyFacts(ponderosaPine, wikidataQidProp.key);
        assertEquals(ponderosaQidBefore.map((f) => f.valueExpression), [`"Q460523"`]);
        // scientific name of jack pine
        const jackPineSciNameBefore = await getPropertyFacts(jackPine, scientificNameProp.key);
        assertEquals(jackPineSciNameBefore.map((f) => f.valueExpression), [`"Pinus banksiana"`]);
        // Wikidata QID of jack pine is not set yet:
        const jackPineQidBefore = await getPropertyFacts(jackPine, wikidataQidProp.key);
        assertEquals(jackPineQidBefore.map((f) => f.valueExpression), []);
        return {
            ponderosaSciNameBefore,
            ponderosaQidBefore,
            jackPineSciNameBefore,
            jackPineQidBefore,
        };
    };

    test("SetPropertyFacts can insert or update property values", async () => {
        // Preconditions:
        await checkPreconditions();

        // Make the edit:
        await doBulkEdits([
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        {
                            propertyKey: scientificNameProp.key,
                            facts: [
                                { valueExpression: `"first new sci name value"`, note: "This is a new value." },
                                { valueExpression: `"second new sci name value"` },
                            ],
                        },
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [
                                // unset all values for this property
                            ],
                        },
                    ],
                },
            },
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        {
                            propertyKey: scientificNameProp.key,
                            facts: [
                                { valueExpression: `"first new sci name value for jack pine"` },
                                { valueExpression: `"second new sci name value for jack pine"`, note: "JP note 2" },
                            ],
                        },
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [
                                { valueExpression: `"Q806838"` },
                            ],
                        },
                    ],
                },
            },
        ]);

        // Now check if it worked:
        const ponderosaSciName = await getPropertyFacts(ponderosaPine, scientificNameProp.key);
        assertEquals(ponderosaSciName.map((f) => f.valueExpression), [
            `"first new sci name value"`,
            `"second new sci name value"`,
        ]);
        assertEquals(ponderosaSciName.map((f) => f.note), ["This is a new value.", ""]);
        assertEquals(ponderosaSciName.map((f) => f.rank), [1, 2]);

        const ponderosaQid = await getPropertyFacts(ponderosaPine, wikidataQidProp.key);
        assertEquals(ponderosaQid.map((f) => f.valueExpression), []);

        const jackPineSciName = await getPropertyFacts(jackPine, scientificNameProp.key);
        assertEquals(jackPineSciName.map((f) => f.valueExpression), [
            `"first new sci name value for jack pine"`,
            `"second new sci name value for jack pine"`,
        ]);
        assertEquals(jackPineSciName.map((f) => f.note), ["", "JP note 2"]);
        assertEquals(jackPineSciName.map((f) => f.rank), [1, 2]);

        const jackPineQid = await getPropertyFacts(jackPine, wikidataQidProp.key);
        assertEquals(jackPineQid.map((f) => f.valueExpression), [`"Q806838"`]);
        assertEquals(jackPineQid.map((f) => f.rank), [1]);
    });

    test("SetPropertyFacts creates AppliedEdit records as if actual edits were made, including with old values", async () => {
        // Preconditions:
        const { ponderosaSciNameBefore, ponderosaQidBefore } = await checkPreconditions();

        // Make the edits:
        const result = await doBulkEdits([
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        {
                            propertyKey: scientificNameProp.key,
                            facts: [
                                { valueExpression: `"first new sci name value"`, note: "This is a new value." },
                                { valueExpression: `"second new sci name value"` },
                            ],
                        },
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [
                                // unset all values for this property
                            ],
                        },
                    ],
                },
            },
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        {
                            propertyKey: scientificNameProp.key,
                            facts: [
                                { valueExpression: `"Pinus banksiana"` }, // Note: unchanged
                                { valueExpression: `"second new sci name value for jack pine"`, note: "JP note 2" },
                            ],
                        },
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [
                                { valueExpression: `"Q806838"` },
                            ],
                        },
                    ],
                },
            },
        ]);

        // Now check if it worked:
        const ponderosaSciName = await getPropertyFacts(ponderosaPine, scientificNameProp.key);
        assertEquals(ponderosaSciName.map((f) => f.valueExpression), [
            `"first new sci name value"`,
            `"second new sci name value"`,
        ]);
        assertEquals(ponderosaSciName.map((f) => f.note), ["This is a new value.", ""]);
        assertEquals(ponderosaSciName.map((f) => f.rank), [1, 2]);

        const ponderosaQid = await getPropertyFacts(ponderosaPine, wikidataQidProp.key);
        assertEquals(ponderosaQid.map((f) => f.valueExpression), []);

        const jackPineSciName = await getPropertyFacts(jackPine, scientificNameProp.key);
        assertEquals(jackPineSciName.map((f) => f.valueExpression), [
            `"Pinus banksiana"`,
            `"second new sci name value for jack pine"`,
        ]);
        assertEquals(jackPineSciName.map((f) => f.note), ["", "JP note 2"]);
        assertEquals(jackPineSciName.map((f) => f.rank), [1, 2]);

        const jackPineQid = await getPropertyFacts(jackPine, wikidataQidProp.key);
        assertEquals(jackPineQid.map((f) => f.valueExpression), [`"Q806838"`]);
        assertEquals(jackPineQid.map((f) => f.rank), [1]);

        // Now, check the edits:
        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            // Delete the old "scientific name" value for ponderosa pine:
            {
                code: "DeletePropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyFactId: ponderosaSciNameBefore[0].id,
                },
                oldData: {
                    valueExpression: ponderosaSciNameBefore[0].valueExpression,
                    note: ponderosaSciNameBefore[0].note,
                    slot: "",
                    rank: 1,
                },
            },
            // Set the two new "scientific name" values for ponderosa pine:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyKey: scientificNameProp.key,
                    propertyFactId: ponderosaSciName[0].id, // We don't know this ID in advance
                    valueExpression: ponderosaSciName[0].valueExpression,
                    note: ponderosaSciName[0].note,
                    slot: "",
                    rank: 1,
                },
                oldData: {},
            },
            {
                code: "AddPropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyKey: scientificNameProp.key,
                    propertyFactId: ponderosaSciName[1].id, // We don't know this ID in advance
                    valueExpression: ponderosaSciName[1].valueExpression,
                    note: ponderosaSciName[1].note,
                    slot: "",
                    rank: 2,
                },
                oldData: {},
            },
            // Delete the old "wikidata QID" value for ponderosa pine:
            {
                code: "DeletePropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyFactId: ponderosaQidBefore[0].id,
                },
                oldData: {
                    valueExpression: ponderosaQidBefore[0].valueExpression,
                    note: ponderosaQidBefore[0].note,
                    slot: "",
                    rank: 1,
                },
            },
            // Add a second "scientific name" value to jack pine, leaving the first unchanged:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyKey: scientificNameProp.key,
                    propertyFactId: jackPineSciName[1].id, // We don't know this ID in advance
                    valueExpression: jackPineSciName[1].valueExpression,
                    note: jackPineSciName[1].note,
                    slot: "",
                    rank: 2,
                },
                oldData: {},
            },
            // Add a wikidata QID value to jack pine, which previously didn't have one:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyKey: wikidataQidProp.key,
                    propertyFactId: jackPineQid[0].id, // We don't know this ID in advance
                    valueExpression: jackPineQid[0].valueExpression,
                    note: jackPineQid[0].note,
                    slot: "",
                    rank: 1,
                },
                oldData: {},
            },
        ]);
    });

    test("SetPropertyFacts has no effect at all if the property values are the same", async () => {
        // Preconditions:
        await checkPreconditions();

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        { propertyKey: scientificNameProp.key, facts: [{ valueExpression: `"Pinus ponderosa"` }] },
                        { propertyKey: wikidataQidProp.key, facts: [{ valueExpression: `"Q460523"` }] },
                    ],
                },
            },
            {
                code: "SetPropertyFacts",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        { propertyKey: scientificNameProp.key, facts: [{ valueExpression: `"Pinus banksiana"` }] },
                        { propertyKey: wikidataQidProp.key, facts: [] },
                    ],
                },
            },
        ]);

        // Now check that nothing happened:
        await checkPreconditions();
        assertEquals(result.appliedEditIds, []);
    });

    test("SetPropertyFacts gives an error if the entry doesn't exist", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetPropertyFacts",
                        data: {
                            entryWith: { entryId: VNID() },
                            set: [
                                {
                                    propertyKey: scientificNameProp.key,
                                    facts: [
                                        { valueExpression: `"Foous barus"`, note: "This entry doesn't exist" },
                                    ],
                                },
                            ],
                        },
                    },
                ]),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            "Unable to bulk set property facts. Check if entryId, entryKey, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a relationship property.",
        );
    });

    test("SetPropertyFacts gives an error if the property doesn't apply to the entry type", async () => {
        const genusEntry = defaultData.entries.genusPinus;
        await assertExists(genusEntry);
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetPropertyFacts",
                        data: {
                            entryWith: { entryId: genusEntry.id },
                            set: [
                                {
                                    propertyKey: scientificNameProp.key,
                                    facts: [
                                        {
                                            valueExpression: `"Foobar"`,
                                            note: "Scientific name doesn't apply to 'genus' entries",
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ]),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            "Unable to bulk set property facts. Check if entryId, entryKey, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a relationship property.",
        );
    });

    test("SetPropertyFacts gives an error if the property is a relationship property", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetPropertyFacts",
                        data: {
                            entryWith: { entryId: ponderosaPine.id },
                            set: [
                                {
                                    propertyKey: defaultData.schema.properties.parentGenus.key,
                                    facts: [
                                        { valueExpression: `entry("${defaultData.entries.genusThuja.id}")` },
                                    ],
                                },
                            ],
                        },
                    },
                ]),
            "ApplyEdits action failed during apply() method",
        );
        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            "Unable to bulk set property facts. Check if entryId, entryKey, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a relationship property.",
        );
    });

    test("SetPropertyFacts gives an error if conflicting values are specified for the same property.", async () => {
        // this is based on an actual error seen when writing import code - it's easy to use the same property key twice.
        const err = await assertRejects(() =>
            doBulkEdits([
                {
                    code: "SetPropertyFacts",
                    data: {
                        entryWith: { entryKey: jackPine.key },
                        set: [
                            // The first 'set' value sets the scientific name to "A":
                            { propertyKey: scientificNameProp.key, facts: [{ valueExpression: `"A"` }] },
                            // But then this one changes it to "B"
                            { propertyKey: scientificNameProp.key, facts: [{ valueExpression: `"B"` }] },
                        ],
                    },
                },
            ])
        );

        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            `Unable to bulk set property facts. The entry with entryKey "${jackPine.key}" had conflicting values for the "${scientificNameProp.key}" property.`,
        );
    });
});
