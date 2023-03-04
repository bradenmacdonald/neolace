import { assert, assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { entryToIndexDocument, preloadDataForIndexingEntries } from "./entry-to-index-doc.ts";
import * as api from "neolace/deps/neolace-sdk.ts";

group("entryToIndexDocument", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("It gives the expected result for ponderosa pine", async () => {
        const entryId = defaultData.entries.ponderosaPine.id;
        const preloadedData = await preloadDataForIndexingEntries([entryId]);
        const data = await entryToIndexDocument(entryId, preloadedData[entryId]);
        const propsExpected = {
            [`prop-${defaultData.schema.properties.parentGenus.key}`]: ["Pinus"],
            [`prop-${defaultData.schema.properties.hasHeroImage.key}`]: [defaultData.entries.imgPonderosaTrunk.name],
            [`prop-${defaultData.schema.properties.hasPart.key}`]: ["Pollen cone", "Seed cone"],
            [`prop-${defaultData.schema.properties.propScientificName.key}`]: ["Pinus ponderosa"],
            [`prop-${defaultData.schema.properties.propWikidataQID.key}`]: ["Q460523"],
        };
        const expected: api.EntryIndexDocument = {
            id: defaultData.entries.ponderosaPine.id,
            name: defaultData.entries.ponderosaPine.name,
            entryTypeKey: defaultData.schema.entryTypes.ETSPECIES.key,
            key: defaultData.entries.ponderosaPine.key,
            description: data.description,
            articleText: data.articleText,
            visibleToGroups: ["public"],
            allProps: [
                "Genus: Pinus",
                "Scientific name: Pinus ponderosa",
                "Has part: Pollen cone, Seed cone",
                "Wikidata Item ID: Q460523",
                "Has hero image: Ponderosa Pine Trunk in Lassen Volcanic National Park",
            ],
            ...propsExpected,
        };

        assertEquals(data, expected);

        // Ensure that the bold formatting ("***Pinus ponderosa***") has been stripped out:
        assert(data.description.startsWith("Pinus ponderosa (ponderosa pine) "));
    });
});
