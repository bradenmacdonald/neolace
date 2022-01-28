import { assert, assertEquals, group, setTestIsolation, test } from "neolace/lib/tests.ts";
import { entryToIndexDocument } from "./entry-to-index-doc.ts";
import * as api from "neolace/deps/neolace-api.ts";

group("entryToIndexDocument", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

    test("pre - test", () => {});

    test("It gives the expected result for ponderosa pine", async () => {
        const data = await entryToIndexDocument(defaultData.entries.ponderosaPine.id);
        const propsExpected = {
            [`prop${defaultData.schema.properties._parentGenus.id}`]: ["Pinus"],
            [`prop${defaultData.schema.properties._hasHeroImage.id}`]: [defaultData.entries.imgPonderosaTrunk.name],
            [`prop${defaultData.schema.properties._hasPart.id}`]: ["Pollen cone", "Seed cone"],
            [`prop${defaultData.schema.properties._propScientificName.id}`]: ["Pinus ponderosa"],
            [`prop${defaultData.schema.properties._propWikidataQID.id}`]: ["Q460523"],
        };
        const expected: api.EntryIndexDocument = {
            id: defaultData.entries.ponderosaPine.id,
            name: defaultData.entries.ponderosaPine.name,
            type: defaultData.schema.entryTypes._ETSPECIES.name,
            friendlyId: defaultData.entries.ponderosaPine.friendlyId,
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
