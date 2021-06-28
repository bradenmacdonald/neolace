import { Vertex } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { onShutDown } from "neolace/app/shutdown.ts";

export const graph = new Vertex({
    neo4jUrl: config.neo4jUrl,
    neo4jUser: config.neo4jUser,
    neo4jPassword: config.neo4jPassword,
    debugLogging: false,
    extraMigrations: {
        // Users have unique email addresses:
        userEmailUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async tx => {
                    await tx.run("CREATE CONSTRAINT user_email_uniq ON (u:Human) ASSERT u.email IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite(tx => tx.run("DROP CONSTRAINT user_email_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Users have unique authN ID values:
        userAuthNIdUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async tx => {
                    await tx.run("CREATE CONSTRAINT user_authnId_uniq ON (u:Human) ASSERT u.authnId IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite(tx => tx.run("DROP CONSTRAINT user_authnId_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Bots have unique auth token values:
        botAuthTokenUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async tx => {
                    await tx.run("CREATE CONSTRAINT bot_authtoken_uniq ON (u:Bot) ASSERT u.authToken IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite(tx => tx.run("DROP CONSTRAINT bot_authtoken_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // Sites have unique "site code" values:
        siteCodeUnique: {
            forward: async (dbWrite) => {
                await dbWrite(async tx => {
                    await tx.run("CREATE CONSTRAINT site_sitecode_uniq ON (s:Site) ASSERT s.siteCode IS UNIQUE");
                });
            },
            backward: async (dbWrite) => {
                await dbWrite(tx => tx.run("DROP CONSTRAINT site_sitecode_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
        // The SHA-256 hash works as a unique primary key for DataFile nodes:
        datafileHash: {
            forward: async (dbWrite) => {
                await dbWrite(tx => tx.run(
                    "CREATE CONSTRAINT datafile_sha256Hash_uniq ON (df:DataFile) ASSERT df.sha256Hash IS UNIQUE"
                ));
            },
            backward: async (dbWrite) => {
                await dbWrite(tx => tx.run("DROP CONSTRAINT datafile_sha256Hash_uniq IF EXISTS"));
            },
            dependsOn: [],
        },
    },
});

onShutDown(async () => {
    // When our application shuts down, we need to shut down our connections to the graph database:
    await graph.shutdown();
});
