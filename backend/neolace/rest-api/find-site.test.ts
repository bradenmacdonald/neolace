/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { assertEquals, assertRejects, getClient, group, SDK, setTestIsolation, test } from "neolace/rest-api/tests.ts";

group("find.ts", () => {
    group("Site Lookup API", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("can lookup a site by domain, without any authentication", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(/* no authentication */);
            const result = await client.getSite({ domain: defaultData.site.domain });

            assertEquals(result, {
                name: "PlantDB",
                key: "plantdb",
                domain: "plantdb.local.neolace.net",
                url: "http://plantdb.local.neolace.net:4445",
                description: "",
                footerContent: "Powered by [Neolace](https://www.neolace.com/).",
                frontendConfig: {
                    headerLinks: [
                        { text: "Home", href: "/" },
                        { text: "Ponderosa", href: "/entry/s-pinus-ponderosa" },
                    ],
                    features: {
                        hoverPreview: {
                            enabled: true,
                        },
                    },
                    plugins: {
                        search: {},
                    },
                },
                homeSiteName: "Neolace Development",
                homeSiteUrl: "http://home.local.neolace.net:4445",
                isHomeSite: false,
            });
        });

        test("throws a 404 if no site exists with the given domain", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(/* no authentication */);
            await assertRejects(
                () => client.getSite({ domain: "adjfdasjfioashtiasdhfkjasdhf.asdfasdf.no" }),
                SDK.NotFound,
                `Site with domain \"adjfdasjfioashtiasdhfkjasdhf.asdfasdf.no\" not found.`,
            );
        });
    });
});
