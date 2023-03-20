/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { Vertex } from "neolace/deps/vertex-framework.ts";
import { config } from "neolace/app/config.ts";
import { registerPluginVNodeTypes, registerVNodeTypes } from "./graph-init.ts";
import { defineStoppableResource } from "../lib/stoppable.ts";
import { keyMigration } from "./key.ts";

export const [getGraph, stopGraphDatabaseConnection] = defineStoppableResource(async () => {
    const graph = new Vertex({
        neo4jUrl: config.neo4jUrl,
        neo4jDatabase: config.neo4jDatabase,
        neo4jUser: config.neo4jUser,
        neo4jPassword: config.neo4jPassword,
        extraMigrations: {
            // Users have unique usernames:
            usernameUnique: {
                forward: async (dbWrite) => {
                    await dbWrite(async (tx) => {
                        await tx.run("CREATE CONSTRAINT user_username_uniq FOR (u:Human) REQUIRE u.username IS UNIQUE");
                    });
                },
                backward: async (dbWrite) => {
                    await dbWrite((tx) => tx.run("DROP CONSTRAINT user_username_uniq IF EXISTS"));
                },
                dependsOn: [],
            },
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
            // Sites have unique "key" values:
            siteKeyUnique: {
                forward: async (dbWrite) => {
                    await dbWrite("CREATE CONSTRAINT site_key_uniq FOR (s:Site) REQUIRE s.key IS UNIQUE");
                },
                backward: async (dbWrite) => {
                    await dbWrite("DROP CONSTRAINT site_key_uniq IF EXISTS");
                },
                dependsOn: [],
            },
            // Sites have unique "domain" values:
            siteDomainUnique: {
                forward: async (dbWrite) => {
                    await dbWrite("CREATE CONSTRAINT site_domain_uniq FOR (s:Site) REQUIRE s.domain IS UNIQUE");
                },
                backward: async (dbWrite) => {
                    await dbWrite("DROP CONSTRAINT site_domain_uniq IF EXISTS");
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
            // The "UniqueId" node type (which is not a VNode) has a unique index on 'name'
            // We use this to generate incrementing IDs for Drafts, and maybe other types in the future.
            // See https://stackoverflow.com/q/32040409
            uniqueIdGenerator: {
                forward: async (dbWrite) => {
                    await dbWrite("CREATE CONSTRAINT uniqueid_name_uniq FOR (uid:UniqueId) REQUIRE uid.name IS UNIQUE");
                },
                backward: async (dbWrite) => {
                    await dbWrite("DROP CONSTRAINT uniqueid_name_uniq IF EXISTS");
                },
                dependsOn: [],
            },
            // The Draft VNode type has a unique index on 'siteNamespace, num'
            draftUniqueNumber: {
                forward: async (dbWrite) => {
                    await dbWrite(
                        "CREATE CONSTRAINT draft_idnumber_uniq FOR (d:Draft) REQUIRE (d.siteNamespace, d.num) IS UNIQUE",
                    );
                },
                backward: async (dbWrite) => {
                    await dbWrite("DROP CONSTRAINT draft_idnumber_uniq IF EXISTS");
                },
                dependsOn: [],
            },
            // The Connection VNode type has a unique index on 'siteNamespace, key'
            connectionUniqueKey: keyMigration("Connection"),
            // The EntryType VNode type has a unique index on 'siteNamespace, key'
            entryTypeUniqueKey: keyMigration("EntryType"),
            // The EntryType VNode type has a unique index on 'siteNamespace, key'
            propertyUniqueKey: keyMigration("Property"),
            // The Entry VNode type has a unique index on 'siteNamespace, key'
            entryUniqueKey: keyMigration("Entry"),
        },
    });

    registerVNodeTypes(graph);
    await registerPluginVNodeTypes(graph);
    return {
        resource: graph,
        stopFn: () => graph.shutdown(),
    };
});
