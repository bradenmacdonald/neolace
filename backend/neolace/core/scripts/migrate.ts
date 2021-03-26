/**
 * Apply migrations to the Neo4j database (and anything else)
 */
import { graph } from "../graph";
import { runScript } from "./util";

// Run the above function
runScript(graph.runMigrations());
