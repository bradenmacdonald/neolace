/**
 * Apply migrations to the Neo4j database (and anything else)
 */
import { graph } from "neolace/core/graph.ts";
import { shutdown } from "../app/shutdown.ts";

await graph.runMigrations();
await shutdown();
