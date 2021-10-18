/**
 * Wipe the dev database and reset it to the PlantDB example
 */
import { shutdown } from "neolace/app/shutdown.ts";
import { generateTestFixtures } from "neolace/lib/tests-default-data.ts";
 
// First reset the database, apply migrations, and create the same PlantDB content used for tests.
await generateTestFixtures();

shutdown();
