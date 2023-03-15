/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
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
