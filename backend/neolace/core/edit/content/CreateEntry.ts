import { C } from "neolace/deps/vertex-framework.ts";
import { CreateEntry, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doCreateEntry = defineImplementation(CreateEntry, async (tx, data, siteId) => {
    if (data.friendlyId.length > 55) {
        throw new InvalidEdit(
            CreateEntry.code,
            { entryId: data.entryId },
            `The friendlyId "${data.friendlyId}" is too long.`,
        );
    }
    await tx.queryOne(C`
        MATCH (et:${EntryType} {id: ${data.type}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
        CREATE (e:${Entry} {id: ${data.entryId}})
        CREATE (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)
        SET e.siteNamespace = site.id
        SET e += ${{
        friendlyId: data.friendlyId,
        name: data.name,
        description: data.description,
    }}
    `.RETURN({}));

    return {
        modifiedNodes: [data.entryId],
    };
});
