import { assertEquals, getClient, group, test } from "neolace/rest-api/tests.ts";

group("Health Check API", () => {
    test("can check that the API is working", async () => {
        const client = await getClient();
        const result = await client.checkHealth();
        assertEquals(result, {
            reachable: true,
            databaseWorking: true,
        });
    });
});