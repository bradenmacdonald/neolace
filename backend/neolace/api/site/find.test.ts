import { api, assertEquals, assertRejects, getClient, group, setTestIsolation, test } from "neolace/api/tests.ts";

group(import.meta, () => {
    group("Site Lookup API", () => {
        const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_NO_ISOLATION);

        test("can lookup a site by domain, without any authentication", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(/* no authentication */);
            const result = await client.getSite({ domain: defaultData.site.domain });

            assertEquals(result, {
                name: "PlantDB",
                shortId: "plantdb",
                domain: "plantdb.local.neolace.net",
                description: null,
                footerMD: "Powered by [Neolace](https://www.neolace.com/).",
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
                },
            });
        });

        test("throws a 404 if no site exists with the given domain", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(/* no authentication */);
            await assertRejects(
                () => client.getSite({ domain: "adjfdasjfioashtiasdhfkjasdhf.asdfasdf.no" }),
                api.NotFound,
                `Site with domain \"adjfdasjfioashtiasdhfkjasdhf.asdfasdf.no\" not found.`,
            );
        });
    });
});