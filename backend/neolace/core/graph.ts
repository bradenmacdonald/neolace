import { Vertex } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { registerPluginVNodeTypes, registerVNodeTypes } from "./graph-init.ts";
import { defineStoppableResource } from "../lib/stoppable.ts";

export const [getGraph, stopGraphDatabaseConnection] = defineStoppableResource(async () => {
    const graph = new Vertex({
        neo4jUrl: config.neo4jUrl,
        neo4jUser: config.neo4jUser,
        neo4jPassword: config.neo4jPassword,
        debugLogging: false,
        extraMigrations: {
            // Users have unique email addresses:
            userEmailUnique: {
                forward: async (dbWrite) => {
                    await dbWrite(async (tx) => {
                        await tx.run("CREATE CONSTRAINT user_email_uniq FOR (u:Human) REQUIRE u.email IS UNIQUE");
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
                        await tx.run("CREATE CONSTRAINT user_authnId_uniq FOR (u:Human) REQUIRE u.authnId IS UNIQUE");
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
                        await tx.run("CREATE CONSTRAINT bot_authtoken_uniq FOR (u:Bot) REQUIRE u.authToken IS UNIQUE");
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
                        await tx.run("CREATE CONSTRAINT site_domain_uniq FOR (s:Site) REQUIRE s.domain IS UNIQUE");
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
                        await tx.run("CREATE CONSTRAINT site_sitecode_uniq FOR (s:Site) REQUIRE s.siteCode IS UNIQUE");
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
                            "CREATE CONSTRAINT propertyfact_directrelneo4jid_uniq FOR (pf:PropertyFact) REQUIRE pf.directRelNeo4jId IS UNIQUE",
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

    registerVNodeTypes(graph);
    await registerPluginVNodeTypes(graph);
    return {
        resource: graph,
        stopFn: () => graph.shutdown(),
    };
});
