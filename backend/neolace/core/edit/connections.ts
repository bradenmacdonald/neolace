import { C, defineAction, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { VNID } from "neolace/deps/neolace-api.ts";
import { Connection, getGraph, Site } from "neolace/core/mod.ts";
import { siteCodeForSite } from "../Site.ts";
import { EditSource } from "./EditSource.ts";

export { Connection };

export interface ConnectionData {
    id: VNID;
    friendlyId: string;
    name: string;
    plugin: string;
    config: Record<string, unknown>;
}

const CreateConnection = defineAction({
    type: `CreateConnection` as const,
    parameters: {} as {
        id: VNID;
        friendlyId: string;
        siteId: VNID;
        plugin: string;
    },
    resultData: {},
    apply: async function applyCreateAction(tx, data) {
        await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            CREATE (c:${Connection}:${C(EditSource.label)} {id: ${data.id}})
            CREATE (c)-[:${Connection.rel.FOR_SITE}]->(site)
            SET c.slugId = "connection-" + site.siteCode + ${data.friendlyId}
            SET c += ${{
            name: data.friendlyId,
            plugin: data.plugin,
            config: "{}",
        }}
        `.RETURN({}));
        return {
            resultData: {},
            modifiedNodes: [data.id],
            description: `Created ${Connection.withId(data.id)}`,
        };
    },
});

export async function getConnection({ friendlyId, siteId, plugin, create = false }: {
    friendlyId: string;
    siteId: VNID;
    plugin: string;
    /** Create this connection if it doesn't exist? */
    create: boolean;
}): Promise<ConnectionData> {
    const graph = await getGraph();
    const siteCode = await siteCodeForSite(siteId);
    const fullSlugId = Connection.slugIdPrefix + siteCode + friendlyId;
    let result;
    try {
        result = await graph.pullOne(Connection, (c) => c.id.name.plugin.config, {
            key: fullSlugId,
        });
    } catch (err) {
        if (err instanceof EmptyResultError) {
            if (create) {
                const newId = VNID();
                await graph.runAsSystem(CreateConnection({
                    id: newId,
                    friendlyId,
                    siteId,
                    plugin,
                }));
                result = await graph.pullOne(Connection, (c) => c.id.name.plugin.config, { key: newId });
            } else {
                throw new Error(`Connection "${friendlyId}" not found.`);
            }
        } else {
            throw err;
        }
    }
    if (result.plugin !== plugin) {
        throw new Error(
            `That connection uses a different plugin (${result.plugin}) and cannot be used with ${plugin}.`,
        );
    }
    return {
        id: result.id,
        friendlyId,
        name: result.name,
        plugin,
        config: result.config,
    };
}
