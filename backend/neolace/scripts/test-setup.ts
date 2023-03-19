/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { environment } from "neolace/app/config.ts";
import { log } from "neolace/app/log.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { generateTestFixtures, testDataFile, TestSetupData } from "neolace/lib/tests-default-data.ts";

log.info("Seting up test environment");
if (environment !== "test") {
    log.error("You need to run test code with ENV_TYPE=test");
    Deno.exit(1);
}
const data: TestSetupData = await generateTestFixtures();
await Deno.writeTextFile(testDataFile, JSON.stringify(data));
log.info("Test setup complete");
shutdown();
