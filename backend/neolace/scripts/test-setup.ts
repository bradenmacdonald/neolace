import * as log from "std/log/mod.ts";
import { generateTestFixtures, TestSetupData, testDataFile } from "neolace/lib/tests-default-data.ts";
import { shutdown } from "neolace/app/shutdown.ts";
import { environment } from "neolace/app/config.ts";


log.info("Seting up test environment");
if (environment !== "test") {
    log.error("You need to run test code with ENV_TYPE=test");
    Deno.exit(1);
}
const data: TestSetupData = await generateTestFixtures();
await Deno.writeTextFile(testDataFile, JSON.stringify(data));
log.info("Test setup complete");
shutdown();
