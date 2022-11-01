import { C } from "neolace/deps/vertex-framework.ts";
import { CreateEntry, InvalidEdit } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Site } from "neolace/core/mod.ts";

export const doCreateEntry = defineImplementation(CreateEntry, async (tx, data, siteId) => {
    if (data.friendlyId.length > 55) {
        throw new InvalidEdit(
            CreateEntry.code,
            { entryId: data.id },
            `The friendlyId "${data.friendlyId}" is too long.`,
        );
    }
    await tx.queryOne(C`
        MATCH (et:${EntryType} {id: ${data.type}})-[:${EntryType.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
        CREATE (e:${Entry} {id: ${data.id}})
        CREATE (e)-[:${Entry.rel.IS_OF_TYPE}]->(et)
        SET e.slugId = site.siteCode + ${data.friendlyId}
        SET e += ${{
        name: data.name,
        description: data.description,
    }}
    `.RETURN({}));

    return {
        modifiedNodes: [data.id],
    };
});
