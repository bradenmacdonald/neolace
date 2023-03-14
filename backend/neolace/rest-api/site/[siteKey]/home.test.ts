/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, getClient, group, setTestIsolation, test } from "neolace/rest-api/tests.ts";
import { getGraph } from "neolace/core/graph.ts";
import { UpdateSite } from "neolace/core/Site.ts";

group("home.ts", () => {
    // Test using the PlantDB example site
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const speciesEntryType = defaultData.schema.entryTypes.ETSPECIES;
    const ponderosaPine = defaultData.entries.ponderosaPine;

    test("Get a site's home page, including references to entries", async () => {
        const graph = await getGraph();
        const client = await getClient(defaultData.users.admin, defaultData.site.key);

        const homePageContent = `This is some test content that links to [a cool tree](/entry/${ponderosaPine.key}).`;

        await graph.runAsSystem(UpdateSite({
            id: defaultData.site.id,
            homePageContent,
        }));

        const result = await client.getSiteHomePage();

        assertEquals(result.homePageContent, homePageContent);
        const refCacheEntries = Object.values(result.referenceCache.entries);
        assertEquals(
            refCacheEntries.map((e) => ({ name: e.name, key: e.key })),
            [{ name: ponderosaPine.name, key: ponderosaPine.key }],
        );
        assertEquals(result.referenceCache.entryTypes, {
            [speciesEntryType.key]: {
                key: speciesEntryType.key,
                name: speciesEntryType.name,
                color: speciesEntryType.color,
                abbreviation: speciesEntryType.abbreviation,
            },
        });
    });
});
