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
    const genus = defaultData.schema.entryTypes._ETGENUS;
    const scientificNameProp = defaultData.schema.properties._propScientificName;
    const wikidataQidProp = defaultData.schema.properties._propWikidataQID;
    const parentGenusProp = defaultData.schema.properties._parentGenus;

    const genusAcer = {
        friendlyId: "g-acer",
        name: "Acer",
        description: 'Commonly known as "maples".',
        wikidataQid: "Q42292",
    };
    const redMaple = {
        friendlyId: "s-red-maple",
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
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: genus.id, friendlyId: genusAcer.friendlyId },
                    set: { name: genusAcer.name, description: genusAcer.description },
                },
            },
            {
                code: "UpsertEntryByFriendlyId",
                data: {
                    where: { entryTypeId: species.id, friendlyId: redMaple.friendlyId },
                    set: { name: redMaple.name, description: redMaple.description },
                },
            },
            // Set value properties:
            {
                code: "SetPropertyFacts",
                data: {
                    entryWith: { friendlyId: genusAcer.friendlyId },
                    set: [
                        {
                            propertyId: wikidataQidProp.id,
                            facts: [{ valueExpression: `"${genusAcer.wikidataQid}"` }],
                        },
                    ],
                },
            },
            {
                code: "SetPropertyFacts",
                data: {
                    entryWith: { friendlyId: redMaple.friendlyId },
                    set: [
                        {
                            propertyId: scientificNameProp.id,
                            facts: [{ valueExpression: `"${redMaple.scientificName}"` }],
                        },
                        {
                            propertyId: wikidataQidProp.id,
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
                    entryWith: { friendlyId: redMaple.friendlyId },
                    set: [
                        {
                            propertyId: parentGenusProp.id,
                            toEntries: [{ entryWith: { friendlyId: genusAcer.friendlyId } }],
                        },
                    ],
                },
            },
        ]);

        // Now check if it worked:
        const { id: genusAcerId } = await assertExists(genusAcer);
        const { id: redMapleId } = await assertExists(redMaple);
        const redMapleSciName = await getPropertyFacts({ id: redMapleId }, scientificNameProp.id);
        assertEquals(redMapleSciName.map((f) => f.valueExpression), [`"${redMaple.scientificName}"`]);
        assertEquals(redMapleSciName.map((f) => f.note), [""]);
        assertEquals(redMapleSciName.map((f) => f.rank), [1]);

        const redMapleQid = await getPropertyFacts({ id: redMapleId }, wikidataQidProp.id);
        assertEquals(redMapleQid.map((f) => f.valueExpression), [`"${redMaple.wikidataQid}"`]);
        const genusAcerQid = await getPropertyFacts({ id: genusAcerId }, wikidataQidProp.id);
        assertEquals(genusAcerQid.map((f) => f.valueExpression), [`"${genusAcer.wikidataQid}"`]);

        // Check the relationship:
        const forwardTest = await evaluateEntryListLookup(
            { id: redMapleId },
            `this.get(prop=prop("${parentGenusProp.id}"))`,
        );
        assertEquals(forwardTest, [genusAcerId]); // The parent genus of the red maple is Acer
        const reverseTest = await evaluateEntryListLookup(
            { id: genusAcerId },
            `this.reverse(prop=prop("${parentGenusProp.id}"))`,
        );
        assertEquals(reverseTest, [redMapleId]); // The species with Acer as their parent genus are: red maple
    });
});
