import { C } from "neolace/deps/vertex-framework.ts";
import { CreateEntryType, EntryTypeColor, VNID } from "neolace/deps/neolace-sdk.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { EntryType, Site } from "neolace/core/mod.ts";

export const doCreateEntryType = defineImplementation(CreateEntryType, async (tx, data, siteId) => {
    const newId = VNID();
    await tx.queryOne(C`
        MATCH (site:${Site} {id: ${siteId}})
        CREATE (et:${EntryType})
        CREATE (et)-[:${EntryType.rel.FOR_SITE}]->(site)
        SET et.siteNamespace = site.id
        SET et += ${{
        id: newId,
        key: data.key,
        name: data.name,
        description: "",
        keyPrefix: "",
        color: EntryTypeColor.Default,
        abbreviation: "",
    }}
    `.RETURN({}));

    return {
        modifiedNodes: [newId],
    };
});
