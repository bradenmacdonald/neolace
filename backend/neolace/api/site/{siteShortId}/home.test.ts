import { group, test, setTestIsolation, getClient, assertEquals } from "neolace/api/tests.ts";
import { graph } from "neolace/core/graph.ts";
import { UpdateSite } from "../../../core/Site.ts";

group(import.meta, () => {

    // Test using the PlantDB example site
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const speciesEntryType = defaultData.schema.entryTypes._ETSPECIES;
    const ponderosaPine = defaultData.entries.ponderosaPine;

    test("Get a site's home page, including references to entries", async () => {
        const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

        const homePageMD = `This is some test content that links to [a cool tree](/entry/${ponderosaPine.friendlyId}).`;

        await graph.runAsSystem(UpdateSite({
            key: defaultData.site.id,
            homePageMD,
        }));

        const result = await client.getSiteHomePage();

        assertEquals(result.homePageMD, homePageMD);
        const refCacheEntries = Object.values(result.referenceCache.entries);
        assertEquals(
            refCacheEntries.map(e => ({name: e.name, friendlyId: e.friendlyId})),
            [{name: ponderosaPine.name, friendlyId: ponderosaPine.friendlyId}],
        );
        assertEquals(result.referenceCache.entryTypes, {
            [speciesEntryType.id]: {
                id: speciesEntryType.id,
                name: speciesEntryType.name,
            }
        });
    });

});