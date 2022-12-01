import { assertEquals, assertInstanceOf, assertRejects, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { InvalidEdit, VNID } from "neolace/deps/neolace-api.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("SetRelationships bulk edit implementation", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const {
        // siteId,
        ponderosaPine,
        jackPine,
        // stonePine,
        getPropertyFacts,
        evaluateEntryListLookup,
        assertExists,
        doBulkEdits,
        getAppliedEdits,
    } = testHelpers(defaultData);
    const genus = defaultData.schema.entryTypes.ETGENUS;
    const plantPart = defaultData.schema.entryTypes.ETPLANTPART;
    const genusPinus = defaultData.entries.genusPinus;
    const parentGenusProp = defaultData.schema.properties.parentGenus;
    const hasPartProp = defaultData.schema.properties.hasPart;

    const checkPreconditions = async () => {
        // parent genus of ponderosa pine:
        const ponderosaGenusBefore = await evaluateEntryListLookup(
            ponderosaPine,
            `this.get(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(ponderosaGenusBefore, [genusPinus.id]);
        // parent genus of jacke pine:
        const jackPineGenusBefore = await evaluateEntryListLookup(
            jackPine,
            `this.get(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(jackPineGenusBefore, [genusPinus.id]);
    };

    const fooGenusId = VNID();
    const quibblePartId = VNID();
    test("SetRelationships can insert or update property values", async () => {
        // Preconditions:
        await checkPreconditions();

        // Create some entries:
        await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: genus.key, entryId: fooGenusId },
                    set: { key: "g-foo", description: "A genus for testing", name: "Foo Genus" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: plantPart.key, entryId: quibblePartId },
                    set: { key: "pp-quibble", description: "A fake plant part for testing", name: "Quibble" },
                },
            },
        ]);

        // Make the edit:
        await doBulkEdits([
            {
                code: "SetRelationships",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [
                                { entryWith: { entryId: genusPinus.id } }, // This value is unchanged.
                                {
                                    entryWith: { entryKey: "g-foo" },
                                    note: "This is a new second value for parent genus",
                                },
                            ],
                        },
                        {
                            propertyKey: hasPartProp.key,
                            toEntries: [
                                { entryWith: { entryId: quibblePartId }, slot: "q" },
                            ],
                        },
                    ],
                },
            },
            {
                code: "SetRelationships",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [
                                { entryWith: { entryId: fooGenusId } }, // Change the parent genus entirely
                            ],
                        },
                    ],
                },
            },
        ]);

        // Now check if it worked:
        const ponderosaGenus = await evaluateEntryListLookup(
            ponderosaPine,
            `this.get(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(ponderosaGenus, [genusPinus.id, fooGenusId]);
        const jackPineGenus = await evaluateEntryListLookup(jackPine, `this.get(prop=prop("${parentGenusProp.key}"))`);
        assertEquals(jackPineGenus, [fooGenusId]);
        // And make sure reverse() is working:
        const reverseTest = await evaluateEntryListLookup(
            { id: fooGenusId },
            `this.reverse(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(reverseTest, [jackPine.id, ponderosaPine.id]); // reverse() will order these by entry name
        // Check the 'has part' relation we created:
        const ponderosaHasPartFacts = await getPropertyFacts(ponderosaPine, hasPartProp.key); // Note this doesn't include the inherited "has part" values
        assertEquals(ponderosaHasPartFacts.map((f) => f.valueExpression), [`entry("${quibblePartId}")`]);
        assertEquals(ponderosaHasPartFacts.map((f) => f.slot), ["q"]);
    });

    test("SetRelationships creates AppliedEdit records as if actual edits were made, including with old values", async () => {
        // Preconditions:
        await checkPreconditions();
        const jackPineGenusBefore = await getPropertyFacts(jackPine, parentGenusProp.key);
        assertEquals(jackPineGenusBefore.length, 1);

        // Create some entries:
        await doBulkEdits([
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: genus.key, entryId: fooGenusId },
                    set: { key: "g-foo", description: "A genus for testing", name: "Foo Genus" },
                },
            },
            {
                code: "UpsertEntryById",
                data: {
                    where: { entryTypeKey: plantPart.key, entryId: quibblePartId },
                    set: { key: "pp-quibble", description: "A fake plant part for testing", name: "Quibble" },
                },
            },
        ]);

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "SetRelationships",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [
                                { entryWith: { entryId: genusPinus.id } }, // This value is unchanged.
                                {
                                    entryWith: { entryKey: "g-foo" },
                                    note: "This is a new second value for parent genus",
                                },
                            ],
                        },
                        {
                            propertyKey: hasPartProp.key,
                            toEntries: [
                                { entryWith: { entryId: quibblePartId }, slot: "q" },
                            ],
                        },
                    ],
                },
            },
            {
                code: "SetRelationships",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [
                                { entryWith: { entryId: fooGenusId } }, // Change the parent genus entirely
                            ],
                        },
                    ],
                },
            },
        ]);

        // Now, check the edits:
        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            // Set the two new relationship values for ponderosa pine:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyKey: parentGenusProp.key,
                    propertyFactId: appliedEdits[0]?.data.propertyFactId, // We don't know this ID in advance
                    valueExpression: `entry("${fooGenusId}")`,
                    note: "This is a new second value for parent genus",
                    slot: "",
                    rank: 2,
                },
                oldData: {},
            },
            {
                code: "AddPropertyFact",
                data: {
                    entryId: ponderosaPine.id,
                    propertyKey: hasPartProp.key,
                    propertyFactId: appliedEdits[1]?.data.propertyFactId, // We don't know this ID in advance
                    valueExpression: `entry("${quibblePartId}")`,
                    note: "",
                    slot: "q",
                    rank: 1,
                },
                oldData: {},
            },
            // Delete the old "parent genus" value for jack pine:
            {
                code: "DeletePropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyFactId: jackPineGenusBefore[0].id,
                },
                oldData: {
                    valueExpression: jackPineGenusBefore[0].valueExpression,
                    note: jackPineGenusBefore[0].note,
                    slot: "",
                    rank: 1,
                },
            },
            // Add the new "parent genus" value to jack pine:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyKey: parentGenusProp.key,
                    propertyFactId: appliedEdits[3]?.data.propertyFactId, // We don't know this ID in advance
                    valueExpression: `entry("${fooGenusId}")`,
                    note: "",
                    slot: "",
                    rank: 1,
                },
                oldData: {},
            },
        ]);
    });

    test("SetRelationships has no effect at all if the property values are the same", async () => {
        // Preconditions:
        await checkPreconditions();

        // Make the edit:
        const result = await doBulkEdits([
            {
                code: "SetRelationships",
                data: {
                    // This one we match by entryId:
                    entryWith: { entryId: ponderosaPine.id },
                    set: [
                        { propertyKey: parentGenusProp.key, toEntries: [{ entryWith: { entryId: genusPinus.id } }] },
                    ],
                },
            },
            {
                code: "SetRelationships",
                data: {
                    // This one we match by fiendly ID:
                    entryWith: { entryKey: jackPine.key },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [{ entryWith: { entryKey: genusPinus.key } }],
                        },
                    ],
                },
            },
        ]);

        // Now check that nothing happened:
        await checkPreconditions();
        assertEquals(result.appliedEditIds, []);
    });

    test("SetRelationships works if the same relationship is specified twice, with the second one being what is applied.", async () => {
        // this is based on an actual error seen when importing the OpenAlex data, because all of the 'set
        // relationships' get combined into batched requests, and sometimes there is 'newer' data and 'older' data for
        // the same entry-relationship in the same batch. Rather than throwing an internal error, the newer one should
        // overwrite the older one.

        // Preconditions:
        await checkPreconditions();

        // Make the edit:
        const result = await doBulkEdits([
            // The first edit sets the parent genus to thuja:
            {
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: jackPine.key },
                    set: [{
                        propertyKey: parentGenusProp.key,
                        toEntries: [{ entryWith: { entryKey: defaultData.entries.genusThuja.key } }],
                    }],
                },
            },
            // But then this one changes it to cypressus
            {
                code: "SetRelationships",
                data: {
                    entryWith: { entryKey: jackPine.key },
                    set: [{
                        propertyKey: parentGenusProp.key,
                        toEntries: [{ entryWith: { entryKey: defaultData.entries.genusCupressus.key } }],
                    }],
                },
            },
        ]);

        // The 'jack pine' genus should now be cypressus:
        const jackPineGenus = await evaluateEntryListLookup(jackPine, `this.get(prop=prop("${parentGenusProp.key}"))`);
        assertEquals(jackPineGenus, [defaultData.entries.genusCupressus.id]);
        // Now check that only one 'add property fact' resulted:
        const appliedEdits = await getAppliedEdits(result);
        assertEquals(appliedEdits, [
            // Delete the old "parent genus" value for jack pine:
            {
                code: "DeletePropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyFactId: appliedEdits[0]?.data.propertyFactId, // We don't know this ID in advance
                },
                oldData: {
                    valueExpression: `entry("${genusPinus.id}")`,
                    note: "",
                    slot: "",
                    rank: 1,
                },
            },
            // Add the new "parent genus" value to jack pine:
            {
                code: "AddPropertyFact",
                data: {
                    entryId: jackPine.id,
                    propertyKey: parentGenusProp.key,
                    propertyFactId: appliedEdits[1]?.data.propertyFactId, // We don't know this ID in advance
                    valueExpression: `entry("${defaultData.entries.genusCupressus.id}")`,
                    note: "",
                    slot: "",
                    rank: 1,
                },
                oldData: {},
            },
        ]);
    });

    test("SetRelationships gives an error if the entry doesn't exist", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetRelationships",
                        data: {
                            entryWith: { entryId: VNID() },
                            set: [
                                {
                                    propertyKey: parentGenusProp.key,
                                    toEntries: [{ entryWith: { entryId: genusPinus.id } }],
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
            "Unable to bulk set relationship property facts. Check if entryId, key, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a value property.",
        );
    });

    test("SetRelationships gives an error if the property doesn't apply to the entry type", async () => {
        await assertExists(ponderosaPine);
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetRelationships",
                        data: {
                            entryWith: { entryId: ponderosaPine.id },
                            set: [
                                {
                                    // "parent division" doesn't apply to species entries like ponderosa pine:
                                    propertyKey: defaultData.schema.properties.parentDivision.key,
                                    toEntries: [{ entryWith: { entryId: genusPinus.id } }],
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
            "Unable to bulk set relationship property facts. Check if entryId, key, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a value property.",
        );
    });

    test("SetRelationships gives an error if the property is a value property", async () => {
        const err = await assertRejects(
            () =>
                doBulkEdits([
                    {
                        code: "SetRelationships",
                        data: {
                            entryWith: { entryId: ponderosaPine.id },
                            set: [
                                {
                                    propertyKey: defaultData.schema.properties.propWikidataQID.key,
                                    toEntries: [{ entryWith: { entryId: genusPinus.id } }],
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
            "Unable to bulk set relationship property facts. Check if entryId, key, or connectionId is invalid, the property doesn't apply to that entry type, or the property is a value property.",
        );
    });

    test("SetRelationships gives an error if conflicting values are specified for the same relationship.", async () => {
        // this is based on an actual error seen when writing import code - it's easy to use the same property key twice.
        const err = await assertRejects(() =>
            doBulkEdits([
                {
                    code: "SetRelationships",
                    data: {
                        entryWith: { entryKey: jackPine.key },
                        set: [
                            // The first 'set' value sets the parent genus to thuja:
                            {
                                propertyKey: parentGenusProp.key,
                                toEntries: [{ entryWith: { entryKey: defaultData.entries.genusThuja.key } }],
                            },
                            // But then this one changes it to cypressus
                            {
                                propertyKey: parentGenusProp.key,
                                toEntries: [{ entryWith: { entryKey: defaultData.entries.genusCupressus.key } }],
                            },
                        ],
                    },
                },
            ])
        );

        assertInstanceOf(err, Error);
        assertInstanceOf(err.cause, InvalidEdit);
        assertEquals(
            err.cause.message,
            `Unable to bulk set relationship property facts. The entry with entryKey "${jackPine.key}" had conflicting values for the "${parentGenusProp.key}" relationship property.`,
        );
    });
});
