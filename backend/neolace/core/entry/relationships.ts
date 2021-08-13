import {
    C,
    Field,
    WrappedTransaction,
    VNID,
} from "neolace/deps/vertex-framework.ts";

import { slugIdToFriendlyId } from "neolace/core/Site.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { RelationshipFact } from "neolace/core/entry/RelationshipFact.ts";
import { RelationshipType } from "neolace/core/schema/RelationshipType.ts";


/**
 * Helper function to fetch the relationships (RelationshipFacts) directly associated with an Entry.
 *
 * Groups the results by RelationshipType, and paginates them.
 *
 * @param entryId The VNID of the entry in question
 * @param tx The Neo4j transaction to use
 * @returns 
 */
export async function getEntryDirectRelationshipFacts(entryId: VNID, tx: WrappedTransaction, options: {relTypeId?: VNID, limit?: number, skip?: number} = {}) {

    const skip = options.skip || 0;
    const limit = options.limit || 10;
    const relTypeId = options.relTypeId ?? null;

    const relFactData = await tx.query(C`
            MATCH (entry:${Entry} {id: ${entryId}})
            MATCH (entry)-[:${Entry.rel.REL_FACT}]-(relFact:${RelationshipFact})-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:${RelationshipType})
            WHERE ${relTypeId} IS NULL OR relType.id = ${relTypeId}
            WITH DISTINCT entry, relType
            ORDER BY relType.nameForward
                    
                CALL {
                    WITH entry, relType
                    MATCH (entry)-[:${Entry.rel.REL_FACT}]->(relFact:VNode)-[:${RelationshipFact.rel.REL_FACT}]->(otherEntry:VNode),
                        (otherEntry)-[:${Entry.rel.IS_OF_TYPE}]->(otherEntryType:VNode),
                        (relFact)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType)
                    RETURN {id: relFact.id, entry: {id: otherEntry.id, name: otherEntry.name, slugId: otherEntry.slugId, entryTypeId: otherEntryType.id}} AS result
                    ORDER BY relFact.weight DESC, otherEntry.name
                    SKIP ${C.int(skip)} LIMIT ${C.int(limit)}
                }
                RETURN "from" as direction, relType.id as relTypeId, collect(result) as relFacts
        UNION
            MATCH (entry:${Entry} {id: ${entryId}})
            MATCH (entry)<-[:${RelationshipFact.rel.REL_FACT}]-(relFact:VNode)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType:VNode)
            WHERE ${relTypeId} IS NULL OR relType.id = ${relTypeId}
            WITH DISTINCT entry, relType
            ORDER BY relType.nameForward
                    
                CALL {
                    WITH entry, relType
                    MATCH (otherEntry:VNode)-[:${Entry.rel.REL_FACT}]->(relFact:VNode)-[:${RelationshipFact.rel.REL_FACT}]->(entry),
                        (otherEntry)-[:${Entry.rel.IS_OF_TYPE}]->(otherEntryType:VNode),
                        (relFact)-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType)
                    RETURN {id: relFact.id, entry: {id: otherEntry.id, name: otherEntry.name, slugId: otherEntry.slugId, entryTypeId: otherEntryType.id}} AS result
                    ORDER BY relFact.weight DESC, otherEntry.name
                    SKIP ${C.int(skip)} LIMIT ${C.int(limit)}
                }
                RETURN "to" as direction, relType.id as relTypeId, collect(result) as relFacts
    `.givesShape({direction: Field.String, relTypeId: Field.VNID, relFacts: Field.List(
        Field.Record({
            id: Field.VNID,
            entry: Field.Record({id: Field.VNID, name: Field.String, slugId: Field.Slug, entryTypeId: Field.VNID}),
        }),
    )}));
    // Compile the preliminary result
    const result = relFactData.map(e => ({
        direction: e.direction,
        relType: {id: e.relTypeId},
        relFacts: e.relFacts.map(rf => ({id: rf.id, entry: {
            id: rf.entry.id,
            name: rf.entry.name,
            friendlyId: slugIdToFriendlyId(rf.entry.slugId),
            entryType: {id: rf.entry.entryTypeId},
        }})),
        relFactsCount: e.relFacts.length,
    }));

    // Now, if some entry has more relationship facts than 'limit', the relFactsCount (total # of related entries of
    // a specific RelationshipType) will be low, so we need to calculate it correctly. We also need to compute it if
    // we're not on the first page (i.e. if skip > 0)
    const relTypesToCountFrom: VNID[] = result.filter(r => r.direction === "from" && (r.relFactsCount === limit || skip > 0)).map(r => r.relType.id);
    const relTypesToCountTo: VNID[] = result.filter(r => r.direction === "to" && (r.relFactsCount === limit || skip > 0)).map(r => r.relType.id);

    // Update all the counts of relationships FROM this entry to other entries:
    await tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})
        UNWIND ${relTypesToCountFrom} as relTypeId
        MATCH (relType:${RelationshipType} {id: relTypeId})
        MATCH (entry)-[:${Entry.rel.REL_FACT}]->(relFact:${RelationshipFact})-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType)
        RETURN relTypeId, count(*) AS count
    `.givesShape({relTypeId: Field.VNID, count: Field.Int})).then(countsResult => {
        countsResult.forEach(cr => {
            const resultRow = result.find(r => r.direction === "from" && r.relType.id === cr.relTypeId);
            if (resultRow) {
                resultRow.relFactsCount = cr.count;
            }
        });
    });
    // Update all the counts of relationships TO this entry from other entries:
    await tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})
        UNWIND ${relTypesToCountTo} as relTypeId
        MATCH (relType:${RelationshipType} {id: relTypeId})
        MATCH (entry)<-[:${Entry.rel.REL_FACT}]-(relFact:${RelationshipFact})-[:${RelationshipFact.rel.IS_OF_REL_TYPE}]->(relType)
        RETURN relTypeId, count(*) AS count
    `.givesShape({relTypeId: Field.VNID, count: Field.Int})).then(countsResult => {
        countsResult.forEach(cr => {
            const resultRow = result.find(r => r.direction === "to" && r.relType.id === cr.relTypeId);
            if (resultRow) {
                resultRow.relFactsCount = cr.count;
            }
        });
    });

    return result;
}
