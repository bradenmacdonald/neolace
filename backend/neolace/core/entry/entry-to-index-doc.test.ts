import { assert, assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { entryToIndexDocument } from "./entry-to-index-doc.ts";
import * as api from "neolace/deps/neolace-api.ts";

group("entryToIndexDocument", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("pre - test", () => {});

    test("It gives the expected result for ponderosa pine", async () => {
        const data = await entryToIndexDocument(defaultData.entries.ponderosaPine.id);
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
            ...propsExpected,
        };

        assertEquals(data, expected);

        // Ensure that the bold formatting ("***Pinus ponderosa***") has been stripped out:
        assert(data.description.startsWith("Pinus ponderosa (ponderosa pine) "));
    });

    test("post - test", () => {});
});
