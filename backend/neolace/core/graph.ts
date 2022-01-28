import { Vertex } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { onShutDown } from "neolace/app/shutdown.ts";
import { registerPluginVNodeTypes, registerVNodeTypes } from "./graph-init.ts";

const _graph = new Vertex({
    neo4jUrl: config.neo4jUrl,
    neo4jUser: config.neo4jUser,
    neo4jPassword: config.neo4jPassword,
    debugLogging: false,
    extraMigrations: {
        // Users have unique email addresses:
        userEmailUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run("CREATE CONSTRAINT user_email_uniq ON (u:Human) ASSERT u.email IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT user_email_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Users have unique authN ID values:
        userAuthNIdUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run("CREATE CONSTRAINT user_authnId_uniq ON (u:Human) ASSERT u.authnId IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT user_authnId_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Bots have unique auth token values:
        botAuthTokenUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run("CREATE CONSTRAINT bot_authtoken_uniq ON (u:Bot) ASSERT u.authToken IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT bot_authtoken_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Sites have unique "domain" values:
        siteDomainUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run("CREATE CONSTRAINT site_domain_uniq ON (s:Site) ASSERT s.domain IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT site_domain_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Sites have unique "site code" values:
        siteCodeUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run("CREATE CONSTRAINT site_sitecode_uniq ON (s:Site) ASSERT s.siteCode IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT site_sitecode_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // The "directRelNeo4jId" field of PropertyFact nodes must be unique:
        propFactUniqueRelId: {
            forward: async (dbWrite) => {
                await dbWrite(async (tx) => {
                    await tx.run(
                        "CREATE CONSTRAINT propertyfact_directrelneo4jid_uniq ON (pf:PropertyFact) ASSERT pf.directRelNeo4jId IS UNIQUE",
                    );
                });
            },
            backward: async (dbWrite) => {
                await dbWrite((tx) => tx.run("DROP CONSTRAINT propertyfact_directrelneo4jid_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
    },
});

registerVNodeTypes(_graph);
export const graphInitPromise = registerPluginVNodeTypes(_graph);

/**
 * The driver for the Neo4j database.
 * @deprecated Use "await getGraph()" instead.
 */
export const graph = _graph;

/**
 * A Promise that returns the Neo4j driver and Vertex framework. Use this for accessing graph data.
 */
export async function getGraph(): Promise<Vertex> {
    await graphInitPromise;
    return _graph;
}

onShutDown(async () => {
    // When our application shuts down, we need to shut down our connections to the graph database:
    await _graph.shutdown();
});
