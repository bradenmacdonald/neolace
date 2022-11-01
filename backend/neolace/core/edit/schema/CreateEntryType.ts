import { C } from "neolace/deps/vertex-framework.ts";
import { CreateEntryType, EntryTypeColor } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType, Site } from "neolace/core/mod.ts";

export const doCreateEntryType = defineImplementation(CreateEntryType, async (tx, data, siteId) => {
    await tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        CREATE (et:${EntryType} {id: ${data.id}})
        CREATE (et)-[:${EntryType.rel.FOR_SITE}]->(site)
        SET et += ${{
        name: data.name,
        description: "",
        friendlyIdPrefix: "",
        color: EntryTypeColor.Default,
        abbreviation: "",
    }}
    `.RETURN({}));

    return {
        modifiedNodes: [data.id],
    };
});
