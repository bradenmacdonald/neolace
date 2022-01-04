import { group, test, assertEquals, getClient } from "neolace/api/tests.ts";

group(import.meta, () => {

    group("Health Check API", () => {

        test("can check that the API is working", async () => {

            const client = await getClient();
            const result = await client.checkHealth();
            assertEquals(result, {
                reachable: true,
                databaseWorking: true,
            });
        });
    })
});
