/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { C, defineAction, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { VNID } from "neolace/deps/neolace-sdk.ts";
import { Connection, getGraph, Site } from "neolace/core/mod.ts";
import { EditSource } from "./EditSource.ts";

export { Connection };

export interface ConnectionData {
    id: VNID;
    key: string;
    name: string;
    plugin: string;
    config: Record<string, unknown>;
}

const CreateConnection = defineAction({
    type: `CreateConnection` as const,
    parameters: {} as {
        id: VNID;
        key: string;
        siteId: VNID;
        plugin: string;
    },
    resultData: {},
    apply: async function applyCreateAction(tx, data) {
        await tx.queryOne(C`
            MATCH (site:${Site} {id: ${data.siteId}})
            CREATE (c:${Connection}:${C(EditSource.label)} {id: ${data.id}})
            CREATE (c)-[:${Connection.rel.FOR_SITE}]->(site)
            SET c.siteNamespace = site.id
            SET c.key = ${data.key}
            SET c += ${{
            name: data.key,
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

export async function getConnection({ key, siteId, plugin, create = false }: {
    key: string;
    siteId: VNID;
    plugin: string;
    /** Create this connection if it doesn't exist? */
    create: boolean;
}): Promise<ConnectionData> {
    const graph = await getGraph();
    let result;
    try {
        result = await graph.pullOne(Connection, (c) => c.id.name.plugin.config, {
            with: { siteNamespace: siteId, key },
        });
    } catch (err) {
        if (err instanceof EmptyResultError) {
            if (create) {
                const newId = VNID();
                await graph.runAsSystem(CreateConnection({
                    id: newId,
                    key,
                    siteId,
                    plugin,
                }));
                result = await graph.pullOne(Connection, (c) => c.id.name.plugin.config, { key: newId });
            } else {
                throw new Error(`Connection "${key}" not found.`);
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
        key,
        name: result.name,
        plugin,
        config: result.config,
    };
}
