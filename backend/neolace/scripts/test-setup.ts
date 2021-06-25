import * as log from "std/log/mod.ts";
import { generateTestFixtures, TestSetupData, testDataFile } from "neolace/lib/tests-default-data.ts";
import { shutdown } from "neolace/app/shutdown.ts";


log.info("Seting up test environment");
const data: TestSetupData = await generateTestFixtures();
await Deno.writeTextFile(testDataFile, JSON.stringify(data));
log.info("Test setup complete");
await shutdown();
