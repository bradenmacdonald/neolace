/**
 * Apply migrations to the Neo4j database (and anything else)
 */
import { getGraph } from "neolace/core/graph.ts";
import { shutdown } from "../app/shutdown.ts";

const graph = await getGraph();
await graph.runMigrations();
await shutdown();
