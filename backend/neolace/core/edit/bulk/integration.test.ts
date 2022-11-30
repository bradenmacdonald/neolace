import { assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { testHelpers } from "./test-helpers.test.ts";

group("using multiple bulk edits together", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const {
        // siteId,
        species,
        getPropertyFacts,
        assertExists,
        assertNotExists,
        doBulkEdits,
        evaluateEntryListLookup,
    } = testHelpers(defaultData);
    const genus = defaultData.schema.entryTypes.ETGENUS;
    const scientificNameProp = defaultData.schema.properties.propScientificName;
    const wikidataQidProp = defaultData.schema.properties.propWikidataQID;
    const parentGenusProp = defaultData.schema.properties.parentGenus;

    const genusAcer = {
        key: "g-acer",
        name: "Acer",
        description: 'Commonly known as "maples".',
        wikidataQid: "Q42292",
    };
    const redMaple = {
        key: "s-red-maple",
        name: "red maple",
        description: 'the red maple, scientific name "Acer rubrum"',
        scientificName: "Acer rubrum",
        wikidataQid: "Q161364",
    };

    test("combining bulk edits to create entries, properties, and relationships", async () => {
        // Preconditions:
        await assertNotExists(genusAcer);
        await assertNotExists(redMaple);

        // Make the edit:
        await doBulkEdits([
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: genus.key, entryKey: genusAcer.key },
                    set: { name: genusAcer.name, description: genusAcer.description },
                },
            },
            {
                code: "UpsertEntryByKey",
                data: {
                    where: { entryTypeKey: species.key, entryKey: redMaple.key },
                    set: { name: redMaple.name, description: redMaple.description },
                },
            },
            // Set value properties:
            {
                code: "SetPropertyFacts",
                data: {
                    entryWith: { entryKey: genusAcer.key },
                    set: [
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [{ valueExpression: `"${genusAcer.wikidataQid}"` }],
                        },
                    ],
                },
            },
            {
                code: "SetPropertyFacts",
                data: {
                    entryWith: { entryKey: redMaple.key },
                    set: [
                        {
                            propertyKey: scientificNameProp.key,
                            facts: [{ valueExpression: `"${redMaple.scientificName}"` }],
                        },
                        {
                            propertyKey: wikidataQidProp.key,
                            facts: [{ valueExpression: `"${redMaple.wikidataQid}"` }],
                        },
                    ],
                },
            },
            // Set relationships:
            {
                code: "SetRelationships",
                data: {
                    // Parent genus of the red maple is "Acer":
                    entryWith: { entryKey: redMaple.key },
                    set: [
                        {
                            propertyKey: parentGenusProp.key,
                            toEntries: [{ entryWith: { entryKey: genusAcer.key } }],
                        },
                    ],
                },
            },
        ]);

        // Now check if it worked:
        const { id: genusAcerId } = await assertExists(genusAcer);
        const { id: redMapleId } = await assertExists(redMaple);
        const redMapleSciName = await getPropertyFacts({ id: redMapleId }, scientificNameProp.key);
        assertEquals(redMapleSciName.map((f) => f.valueExpression), [`"${redMaple.scientificName}"`]);
        assertEquals(redMapleSciName.map((f) => f.note), [""]);
        assertEquals(redMapleSciName.map((f) => f.rank), [1]);

        const redMapleQid = await getPropertyFacts({ id: redMapleId }, wikidataQidProp.key);
        assertEquals(redMapleQid.map((f) => f.valueExpression), [`"${redMaple.wikidataQid}"`]);
        const genusAcerQid = await getPropertyFacts({ id: genusAcerId }, wikidataQidProp.key);
        assertEquals(genusAcerQid.map((f) => f.valueExpression), [`"${genusAcer.wikidataQid}"`]);

        // Check the relationship:
        const forwardTest = await evaluateEntryListLookup(
            { id: redMapleId },
            `this.get(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(forwardTest, [genusAcerId]); // The parent genus of the red maple is Acer
        const reverseTest = await evaluateEntryListLookup(
            { id: genusAcerId },
            `this.reverse(prop=prop("${parentGenusProp.key}"))`,
        );
        assertEquals(reverseTest, [redMapleId]); // The species with Acer as their parent genus are: red maple
    });
});
