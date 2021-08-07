import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID, Field, EmptyResultError } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { slugIdToFriendlyId, siteCodeForSite } from "neolace/core/Site.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";

/**
 * A helper function to get an entry
 */
export async function getEntry(vnidOrFriendlyId: VNID|string, siteId: VNID, tx: WrappedTransaction, flags: Set<api.GetEntryFlags> = new Set()): Promise<api.EntryData> {

    // If 'vnidOrFriendlyId' is a VNID, use it as-is; otherwise if it's a friendlyID we need to prepend the site prefix
    const key = isVNID(vnidOrFriendlyId) ? vnidOrFriendlyId : (await siteCodeForSite(siteId)) + vnidOrFriendlyId;

    const entryData = await tx.pullOne(Entry, e => e
        .id
        .name
        .description
        .friendlyId()
        .type(et => et.id.name.contentType.site(s => s.id)),
        {key, }
    ).catch((err) => {
        if (err instanceof EmptyResultError) {
            throw new api.NotFound(`Entry with key "${vnidOrFriendlyId}" not found.`);
        } else {
            throw err;
        }
    });

    // Remove the "site" field from the result
    const result: api.EntryData = {
        ...entryData,
        type: {id: entryData.type!.id, name: entryData.type!.name, contentType: entryData.type!.contentType as api.ContentType},
        relationshipFacts: undefined,  // This may be defined below; depends on 'flags'
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    if (flags.has(api.GetEntryFlags.IncludeRelationshipFacts)) {
        // Fetch any relationship facts.
        // We may do this differently in the future, e.g. use "Computed facts" only
        //
        // This complex query first fetches this entry and all of its ancestors, then finds any relationship facts attached
        // to this entry or to its ancestors.
        await tx.query(C`
            MATCH (entry:${Entry} {id: ${entryData.id}})
            CALL apoc.path.expandConfig(entry, {
                sequence: ">VNode,HAS_REL_FACT>,VNode,IS_A>",
                minLevel: 1,
                maxLevel: 50
            })
            YIELD path
            WITH DISTINCT entry, length(path)/2 AS distance, last(nodes(path)) AS parent
            WITH entry, collect({entry: parent, distance: distance}) AS parents
            WITH [{entry: entry, distance: 0}] + parents AS entries

            WITH entries
            UNWIND entries AS e
            WITH e.entry AS entry, e.distance AS distance
            MATCH (entry)-[:HAS_REL_FACT]->(fact:VNode)-[:IS_A|HAS_A|RELATES_TO|DEPENDS_ON]->(toEntry:VNode), (fact)-[:IS_OF_REL_TYPE]->(relType:VNode)
            RETURN entry {.id, .name, .slugId}, distance, properties(fact) AS relProps, toEntry {.id, .name, .slugId}, relType {.id}
        `.givesShape({
            entry: Field.Record({id: Field.VNID, name: Field.String, slugId: Field.String}),
            distance: Field.Int,
            relProps: Field.Record(RelationshipFact.properties),
            toEntry: Field.Record({id: Field.VNID, name: Field.String, slugId: Field.String}),
            relType: Field.Record({id: Field.VNID}),
        })).then(relData => {
            // Add these facts to the result:
            result.relationshipFacts = relData.map(rd => ({
                entry: {id: rd.entry.id, name: rd.entry.name, friendlyId: slugIdToFriendlyId(rd.entry.slugId)},
                distance: rd.distance,
                relProps: rd.relProps,
                toEntry: {id: rd.toEntry.id, name: rd.toEntry.name, friendlyId: slugIdToFriendlyId(rd.toEntry.slugId)},
                relType: rd.relType,
            }));
        });
    }


    return result;
}
